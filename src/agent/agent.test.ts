import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pingModel, getAgent, WATERMARK, buildSystemPrompt } from "./agent";
import { HumanMessage } from "@langchain/core/messages";

const mockInvoke = vi.hoisted(() => vi.fn());
const mockAgentInvoke = vi.hoisted(() => vi.fn());

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(function () {
    return {
      invoke: mockInvoke,
      bindTools: vi.fn().mockReturnValue({ invoke: mockAgentInvoke }),
      getNumTokens: vi.fn(async (text: unknown) => Math.ceil(String(text).length / 4)),
    };
  }),
}));

vi.mock("./tools", () => ({
  browserTools: [
    { name: "read_page_code", invoke: vi.fn().mockResolvedValue("mock html") },
    { name: "read_page_content", invoke: vi.fn().mockResolvedValue("mock content") },
    { name: "click_element", invoke: vi.fn().mockResolvedValue("mock clicked") },
    { name: "follow_link", invoke: vi.fn().mockResolvedValue("mock navigated") },
    { name: "set_field_value", invoke: vi.fn().mockResolvedValue("mock set") },
  ],
}));

const config = {
  model: "test-model",
  apiKey: "test-key",
  baseURL: "http://localhost:11434/v1",
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockAgentInvoke.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockFetch = vi.hoisted(() => vi.fn());
function stubFetch(impl: (...args: unknown[]) => unknown) {
  mockFetch.mockImplementation(impl as (...args: never[]) => unknown);
  vi.stubGlobal("fetch", mockFetch);
}
function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("pingModel (light check, no tokens)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns ok when GET v1/models lists the model", async () => {
    stubFetch(async () => jsonResponse({ data: [{ id: "test-model" }] }));
    const result = await pingModel(config);
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0][0])).toBe("http://localhost:11434/v1/models");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("matches base model name without tag (gemma4 vs gemma4:latest)", async () => {
    stubFetch(async () => jsonResponse({ data: [{ id: "test-model:latest" }] }));
    const result = await pingModel(config);
    expect(result).toEqual({ ok: true });
  });

  it("returns model-not-available when v1/models omits the model", async () => {
    stubFetch(async () => jsonResponse({ data: [{ id: "other" }] }));
    const result = await pingModel(config);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("test-model");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls through to readiness when v1/models is missing (404)", async () => {
    stubFetch(async (...args: unknown[]) => {
      const url = String(args[0]);
      return url.endsWith("/v1/models")
        ? { ok: false, status: 404 }
        : jsonResponse({ status: "healthy" });
    });
    const result = await pingModel(config);
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[1][0])).toBe("http://localhost:11434/health/readiness");
  });

  it("falls through to /api/tags when both v1/models and readiness are missing", async () => {
    stubFetch(async (...args: unknown[]) => {
      const u = String(args[0]);
      if (u.endsWith("/v1/models")) return { ok: false, status: 404 };
      if (u.endsWith("/health/readiness")) return { ok: false, status: 404 };
      return jsonResponse({ models: [{ name: "test-model:latest" }] });
    });
    const result = await pingModel(config);
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("returns offline error when all probes are missing", async () => {
    stubFetch(async () => ({ ok: false, status: 404 }));
    const result = await pingModel(config);
    expect(result).toEqual({ ok: false, error: "Failed to reach the model API" });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns auth error immediately on 401 without further probes", async () => {
    stubFetch(async () => ({ ok: false, status: 401 }));
    const result = await pingModel(config);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("401");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("derives /v1/models under root when baseURL has no /v1 suffix", async () => {
    stubFetch(async () => jsonResponse({ data: [{ id: "test-model" }] }));
    const result = await pingModel({ ...config, baseURL: "http://localhost:11434" });
    expect(result).toEqual({ ok: true });
    expect(String(mockFetch.mock.calls[0][0])).toBe("http://localhost:11434/v1/models");
  });

  it("returns invalid base URL error for malformed baseURL", async () => {
    stubFetch(async () => jsonResponse({ data: [] }));
    const result = await pingModel({ ...config, baseURL: "not a url" });
    expect(result).toEqual({ ok: false, error: "Invalid base URL" });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("getAgent", () => {
  it("returns AI response when model responds without tool calls", async () => {
    mockAgentInvoke.mockResolvedValue({ content: "Hello from AI" });

    const agent = getAgent(config);
    const result = await agent.invoke({ messages: [new HumanMessage("Hi")] });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe("Hi");
    expect(result.messages[1].content).toBe("Hello from AI");
  });

  it("processes a tool call and returns final response on next turn", async () => {
    mockAgentInvoke
      .mockResolvedValueOnce({
        content: "",
        tool_calls: [{ name: "read_page_code", args: {}, id: "call1" }],
      })
      .mockResolvedValueOnce({ content: "Final response" });

    const agent = getAgent(config);
    const result = await agent.invoke({ messages: [new HumanMessage("Read page")] });

    expect(result.messages).toHaveLength(4);
    const toolMsg = result.messages[2];
    expect(toolMsg.content).toBe("mock html");
    expect(result.messages[3].content).toBe("Final response");
  });

  it("handles unknown tool call with error message", async () => {
    mockAgentInvoke
      .mockResolvedValueOnce({
        content: "",
        tool_calls: [{ name: "nonexistent", args: {}, id: "call1" }],
      })
      .mockResolvedValueOnce({ content: "Done" });

    const agent = getAgent(config);
    const result = await agent.invoke({ messages: [new HumanMessage("Do something")] });

    expect(result.messages).toHaveLength(4);
    const toolMsg = result.messages[2];
    expect(toolMsg.content).toContain("unknown tool");
    expect(result.messages[3].content).toBe("Done");
  });

  it("passes page scope system prompt to the model", async () => {
    mockAgentInvoke.mockResolvedValue({ content: "OK" });

    const agent = getAgent({ ...config, scope: "page" });
    await agent.invoke({ messages: [new HumanMessage("Hi")] });

    const calls = mockAgentInvoke.mock.calls;
    const systemMsg = calls[0][0][0];
    expect(systemMsg.content).toContain("SCOPE RESTRICTION");
    expect(systemMsg.content).toContain("OFF-TOPIC");
  });

  it("passes broad scope system prompt to the model", async () => {
    mockAgentInvoke.mockResolvedValue({ content: "OK" });

    const agent = getAgent({ ...config, scope: "broad" });
    await agent.invoke({ messages: [new HumanMessage("General Q")] });

    const calls = mockAgentInvoke.mock.calls;
    const systemMsg = calls[0][0][0];
    expect(systemMsg.content).toContain("broad");
    expect(systemMsg.content).not.toContain("SCOPE RESTRICTION");
    // broad still denies disallowed categories but is benevolent
    expect(systemMsg.content).toContain("MUST DENY");
  });

  it("defaults to page scope when no scope provided", async () => {
    mockAgentInvoke.mockResolvedValue({ content: "OK" });

    const agent = getAgent(config);
    await agent.invoke({ messages: [new HumanMessage("Hi")] });

    const calls = mockAgentInvoke.mock.calls;
    const systemMsg = calls[0][0][0];
    expect(systemMsg.content).toContain("SCOPE RESTRICTION");
    expect(systemMsg.content).toContain("OFF-TOPIC");
  });

  it("both scopes share WATERMARK prefix with divider", async () => {
    mockAgentInvoke.mockResolvedValue({ content: "OK" });

    const agentPage = getAgent({ ...config, scope: "page" });
    await agentPage.invoke({ messages: [new HumanMessage("Hi")] });
    const pageMsg = mockAgentInvoke.mock.calls[0][0][0].content as string;
    mockAgentInvoke.mockClear();

    const agentBroad = getAgent({ ...config, scope: "broad" });
    await agentBroad.invoke({ messages: [new HumanMessage("Hi")] });
    const broadMsg = mockAgentInvoke.mock.calls[0][0][0].content as string;

    for (const msg of [pageMsg, broadMsg]) {
      expect(msg).toContain(WATERMARK);
      expect(msg.indexOf(WATERMARK)).toBe(0);
      expect(msg).toContain("Klunq Widget");
      expect(msg).toContain("SECURITY HIERARCHY");
    }
    // Watermark is identical prefix — copying it to guardrail is sufficient
    expect(pageMsg.slice(0, WATERMARK.length)).toBe(WATERMARK);
    expect(broadMsg.slice(0, WATERMARK.length)).toBe(WATERMARK);
  });

  it("buildSystemPrompt is consistent and starts with WATERMARK", () => {
    const page = buildSystemPrompt("page");
    const broad = buildSystemPrompt("broad");
    expect(page.startsWith(WATERMARK)).toBe(true);
    expect(broad.startsWith(WATERMARK)).toBe(true);
    expect(page).toContain("SCOPE RESTRICTION");
    expect(broad).toContain("MUST DENY");
    expect(broad).not.toContain("SCOPE RESTRICTION");
  });

  it("stops after max 25 iterations when model keeps returning tool calls", async () => {
    mockAgentInvoke.mockResolvedValue({
      content: "",
      tool_calls: [{ name: "read_page_code", args: {}, id: "call1" }],
    });

    const agent = getAgent(config);
    const result = await agent.invoke({ messages: [new HumanMessage("Loop")] });

    expect(mockAgentInvoke).toHaveBeenCalledTimes(25);
    expect(result.messages.length).toBeGreaterThan(40);
  });

  it("processes multiple tool calls in one turn", async () => {
    mockAgentInvoke
      .mockResolvedValueOnce({
        content: "",
        tool_calls: [
          { name: "read_page_code", args: {}, id: "call1" },
          { name: "click_element", args: { query: "#btn" }, id: "call2" },
        ],
      })
      .mockResolvedValueOnce({ content: "All done" });

    const agent = getAgent(config);
    const result = await agent.invoke({ messages: [new HumanMessage("Do things")] });

    expect(result.messages).toHaveLength(5);
    expect(result.messages[2].content).toBe("mock html");
    expect(result.messages[3].content).toBe("mock clicked");
    expect(result.messages[4].content).toBe("All done");
  });
});
