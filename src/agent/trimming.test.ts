// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  trimMessages,
  type BaseMessage,
} from "@langchain/core/messages";
import { MIN_CONTEXT_WINDOW, resolveHistoryBudget, stripProviderPrefix } from "./agent";
import type { ModelConfig } from "./agent";

const base: ModelConfig = { model: "m", apiKey: "k", baseURL: "u" };

describe("stripProviderPrefix", () => {
  it("strips LiteLLM-style provider prefixes", () => {
    expect(stripProviderPrefix("openai/gpt-4o")).toBe("gpt-4o");
    expect(stripProviderPrefix("anthropic/claude-3-5-sonnet-20240620")).toBe(
      "claude-3-5-sonnet-20240620",
    );
    expect(stripProviderPrefix("ollama/gemma4")).toBe("gemma4");
  });

  it("leaves bare names untouched", () => {
    expect(stripProviderPrefix("gpt-4o-mini")).toBe("gpt-4o-mini");
    expect(stripProviderPrefix("gemma4")).toBe("gemma4");
  });
});

describe("resolveHistoryBudget", () => {
  it("gives half the known window for mainstream models", () => {
    expect(resolveHistoryBudget({ ...base, model: "gpt-4o-mini" })).toBe(64000);
  });

  it("resolves prefixed LiteLLM names via the stripped model", () => {
    expect(resolveHistoryBudget({ ...base, model: "openai/gpt-4o" })).toBe(64000);
  });

  it("floors unknown local models to half of the minimum window", () => {
    expect(resolveHistoryBudget({ ...base, model: "gemma4" })).toBe(MIN_CONTEXT_WINDOW / 2);
    expect(MIN_CONTEXT_WINDOW).toBe(32000);
  });

  it("lets data-max-tokens override in either direction", () => {
    expect(resolveHistoryBudget({ ...base, model: "gemma4", maxTokens: 100000 })).toBe(50000);
    expect(resolveHistoryBudget({ ...base, model: "gpt-4o", maxTokens: 4096 })).toBe(2048);
  });
});

describe("trimMessages with agent options", () => {
  // Character counting keeps the tests independent of any tokenizer.
  const counter = (msgs: BaseMessage[]) => msgs.reduce((n, m) => n + String(m.content).length, 0);
  const options = {
    tokenCounter: counter,
    strategy: "last" as const,
    includeSystem: true,
    startOn: ["human", "ai"] as ("human" | "ai")[],
    allowPartial: false,
  };

  it("keeps the system prompt and the newest history within budget", async () => {
    const messages = [
      new SystemMessage("s"),
      new HumanMessage("aaaa"),
      new HumanMessage("bbbb"),
      new HumanMessage("cccc"),
    ];
    const trimmed = await trimMessages(messages, { ...options, maxTokens: 8 });
    expect(trimmed.map((m) => m.content)).toEqual(["s", "cccc"]);
    expect(trimmed[0].type).toBe("system");
  });

  it("passes short histories through untouched, greeting included", async () => {
    const messages = [new SystemMessage("s"), new AIMessage("w"), new HumanMessage("q")];
    const trimmed = await trimMessages(messages, { ...options, maxTokens: 100 });
    expect(trimmed.map((m) => m.content)).toEqual(["s", "w", "q"]);
  });

  it("drops a leading orphan tool message cut off from its tool call", async () => {
    const messages = [
      new SystemMessage("s"),
      new ToolMessage({ content: "orphan", tool_call_id: "x" }),
      new HumanMessage("q"),
    ];
    const trimmed = await trimMessages(messages, { ...options, maxTokens: 100 });
    expect(trimmed.map((m) => m.type)).toEqual(["system", "human"]);
  });

  it("keeps intact AI tool-call pairs", async () => {
    const messages = [
      new SystemMessage("s"),
      new HumanMessage("q"),
      new AIMessage({
        content: "c",
        tool_calls: [{ name: "t", args: {}, id: "c1", type: "tool_call" }],
      }),
      new ToolMessage({ content: "r", tool_call_id: "c1" }),
    ];
    const trimmed = await trimMessages(messages, { ...options, maxTokens: 100 });
    expect(trimmed.map((m) => m.type)).toEqual(["system", "human", "ai", "tool"]);
    expect((trimmed[2] as AIMessage).tool_calls?.length).toBe(1);
  });
});
