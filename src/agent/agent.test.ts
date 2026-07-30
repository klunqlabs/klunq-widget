import { describe, it, expect, vi, beforeEach } from "vitest";
import { pingModel, getAgent } from "./agent";
import { HumanMessage } from "@langchain/core/messages";

const mockInvoke = vi.hoisted(() => vi.fn());
const mockAgentInvoke = vi.hoisted(() => vi.fn());

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(function () {
    return {
      invoke: mockInvoke,
      bindTools: vi.fn().mockReturnValue({ invoke: mockAgentInvoke }),
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

describe("pingModel", () => {
  it("returns { ok: true } when invoke returns non-empty content", async () => {
    mockInvoke.mockResolvedValue({ content: "pong" });
    const result = await pingModel(config);
    expect(result).toEqual({ ok: true });
  });

  it('returns ok: false with "Empty response" when content is empty string', async () => {
    mockInvoke.mockResolvedValue({ content: "" });
    const result = await pingModel(config);
    expect(result).toEqual({ ok: false, error: "Empty response" });
  });

  it('returns ok: false with "Empty response" when content is undefined', async () => {
    mockInvoke.mockResolvedValue({ content: undefined });
    const result = await pingModel(config);
    expect(result).toEqual({ ok: false, error: "Empty response" });
  });

  it("returns ok: false with error message on exception", async () => {
    mockInvoke.mockRejectedValue(new Error("Network error"));
    const result = await pingModel(config);
    expect(result).toEqual({ ok: false, error: "Network error" });
  });

  it("returns ok: false with status prepended on HTTP error", async () => {
    mockInvoke.mockRejectedValue({ status: 401, message: "Unauthorized" });
    const result = await pingModel(config);
    expect(result).toEqual({ ok: false, error: "401 Unauthorized" });
  });

  it('returns ok: false with "Unknown error" when err has no message', async () => {
    mockInvoke.mockRejectedValue({});
    const result = await pingModel(config);
    expect(result).toEqual({ ok: false, error: "Unknown error" });
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
    expect(systemMsg.content).toContain("broad scope");
    expect(systemMsg.content).not.toContain("SCOPE RESTRICTION");
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
