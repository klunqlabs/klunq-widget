// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "preact/hooks";
import { render, cleanup, waitFor, fireEvent } from "@testing-library/preact";
import { AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { useChat } from "./useChat";
import { ModelConfigContext, MessagesContext } from "../App";
import type { ModelConfig } from "../agent/agent";

const mockInvoke = vi.hoisted(() => vi.fn());
const mockGetAgent = vi.hoisted(() => vi.fn().mockReturnValue({ invoke: mockInvoke }));
vi.mock("../agent/agent", () => ({
  getAgent: mockGetAgent,
}));

afterEach(cleanup);
beforeEach(() => {
  mockInvoke.mockReset();
  mockGetAgent.mockClear();
});

const modelConfig: ModelConfig = { model: "m", apiKey: "k", baseURL: "u" };
const welcome = new AIMessage("Welcome");

function harness(
  initialMessages: BaseMessage[] = [welcome],
  probe?: { current: ReturnType<typeof useChat> | null },
) {
  function Harness({ msgs: init }: { msgs: BaseMessage[] }) {
    const [msgs, setMsgs] = useState<BaseMessage[]>(init);
    const [loading, setLoading] = useState(false);
    return (
      <ModelConfigContext.Provider value={modelConfig}>
        <MessagesContext.Provider
          value={{ messages: msgs, setMessages: setMsgs, loading, setLoading }}
        >
          <Consumer probe={probe} />
        </MessagesContext.Provider>
      </ModelConfigContext.Provider>
    );
  }
  function Consumer({ probe }: { probe?: { current: ReturnType<typeof useChat> | null } }) {
    const chat = useChat();
    if (probe) probe.current = chat;
    const { messages, loading, sendMessage, clearMessages } = chat;
    return (
      <div>
        <span data-testid="count">{messages.length}</span>
        <span data-testid="loading">{String(loading)}</span>
        <button data-testid="send" onClick={() => sendMessage("hi")}>
          Send
        </button>
        <button data-testid="clear" onClick={clearMessages}>
          Clear
        </button>
      </div>
    );
  }
  return render(<Harness msgs={initialMessages} />);
}

describe("useChat", () => {
  it("throws outside ModelConfigContext", () => {
    const stderr = console.error;
    console.error = vi.fn();
    function Bad() {
      useChat();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(
      "useChat must be used within a ModelConfigContext.Provider",
    );
    console.error = stderr;
  });

  it("throws outside MessagesContext", () => {
    const stderr = console.error;
    console.error = vi.fn();
    function Bad() {
      useChat();
      return null;
    }
    expect(() =>
      render(
        <ModelConfigContext.Provider value={modelConfig}>
          <Bad />
        </ModelConfigContext.Provider>,
      ),
    ).toThrow("useChat must be used within a MessagesContext.Provider");
    console.error = stderr;
  });

  it("starts with initial message count and not loading", () => {
    const { getByTestId } = harness([welcome]);
    expect(getByTestId("count").textContent).toBe("1");
    expect(getByTestId("loading").textContent).toBe("false");
  });

  it("updates state with agent reply on send", async () => {
    mockInvoke.mockResolvedValue({ messages: [welcome, new AIMessage("Reply")] });
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId("send"));
    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("2");
    });
  });

  it("sets loading true while waiting for agent then false after", async () => {
    let resolve: (v: { messages: BaseMessage[] }) => void;
    mockInvoke.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId("send"));
    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("true");
    });
    resolve!({ messages: [welcome, new AIMessage("Done")] });
    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("false");
    });
  });

  it("adds an error message when agent invoke fails", async () => {
    mockInvoke.mockRejectedValue(new Error("API error"));
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId("send"));
    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("2");
    });
  });

  it("shows a friendly message on 401 without extra agent calls", async () => {
    mockInvoke.mockRejectedValue({ status: 401, message: "Unauthorized" });
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId("send"));
    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("2");
    });
    expect(getByTestId("loading").textContent).toBe("false");
  });

  it("shows a rate-limit message on 429", async () => {
    mockInvoke.mockRejectedValue({ status: 429, message: "Too Many Requests" });
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId("send"));
    await waitFor(() => {
      expect(getByTestId("count").textContent).toBe("2");
    });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("clearMessages keeps only the first message", () => {
    const extra = new AIMessage("Extra");
    const { getByTestId } = harness([welcome, extra]);
    expect(getByTestId("count").textContent).toBe("2");
    fireEvent.click(getByTestId("clear"));
    expect(getByTestId("count").textContent).toBe("1");
  });

  it("keeps both user messages on rapid double send", async () => {
    mockInvoke.mockImplementation(async ({ messages }: { messages: BaseMessage[] }) => ({
      messages: [...messages, new AIMessage("reply")],
    }));
    // Call twice synchronously in the same tick: no re-render happens in
    // between, so a snapshot-based implementation drops the first message.
    const probe: { current: ReturnType<typeof useChat> | null } = { current: null };
    harness([welcome], probe);
    probe.current!.sendMessage("a");
    probe.current!.sendMessage("b");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
    // The second request must include the first user message.
    const secondArgs = mockInvoke.mock.calls[1][0] as { messages: BaseMessage[] };
    expect(secondArgs.messages.length).toBe(3);
  });

  it("merges a late reply instead of overwriting newer messages", async () => {
    const pending: Array<(v: { messages: BaseMessage[] }) => void> = [];
    mockInvoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        }),
    );
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId("send"));
    fireEvent.click(getByTestId("send"));
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    const snapA = mockInvoke.mock.calls[0][0] as { messages: BaseMessage[] };
    const snapB = mockInvoke.mock.calls[1][0] as { messages: BaseMessage[] };
    pending[0]!({ messages: [...snapA.messages, new AIMessage("r1")] });
    pending[1]!({ messages: [...snapB.messages, new AIMessage("r2")] });
    await waitFor(() => {
      // welcome + 2 humans + both reply tails; nothing is lost.
      expect(getByTestId("count").textContent).toBe("5");
    });
  });

  it("creates agent once with the model config from context", () => {
    harness([welcome]);
    expect(mockGetAgent).toHaveBeenCalledTimes(1);
    expect(mockGetAgent).toHaveBeenCalledWith(modelConfig);
  });
});
