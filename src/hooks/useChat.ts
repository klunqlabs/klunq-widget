import { useContext, useEffect, useRef } from "preact/hooks";
import { getAgent } from "../agent/agent";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MessagesContext, ModelConfigContext } from "../App";

export function useChat() {
  const modelConfigContext = useContext(ModelConfigContext);

  if (modelConfigContext === undefined) {
    throw new Error("useChat must be used within a ModelConfigContext.Provider");
  }

  const agent = useRef(getAgent(modelConfigContext));

  const messageContext = useContext(MessagesContext);

  if (messageContext === undefined) {
    throw new Error("useChat must be used within a MessagesContext.Provider");
  }

  const { messages, setMessages, loading, setLoading } = messageContext;

  // Synchronous mirror of the latest messages. Render snapshots go stale
  // across rapid or async flows, so all updates build on this ref instead.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = async (text: string) => {
    const userMsg = new HumanMessage(text);
    const snapshot = [...messagesRef.current, userMsg];
    messagesRef.current = snapshot;
    setMessages(snapshot);
    setLoading(true);

    try {
      const reply = await agent.current.invoke({ messages: snapshot });
      // Only the agent's new tail is ours; anything written while awaiting
      // (another message, a clear) must survive.
      const tail = reply.messages.slice(snapshot.length);
      const merged = [...messagesRef.current, ...tail];
      messagesRef.current = merged;
      setMessages(merged);
    } catch (err) {
      const next = [...messagesRef.current, new AIMessage(friendlyErrorMessage(err))];
      messagesRef.current = next;
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    const next = messagesRef.current.slice(0, 1);
    messagesRef.current = next;
    setMessages(next);
  };

  return { messages, clearMessages, loading, sendMessage };
}

function friendlyErrorMessage(err: unknown): string {
  const status = (err as { status?: number } | null)?.status;
  const raw = err instanceof Error ? err.message : "Unknown error";
  if (status === 401 || status === 403) {
    return `Authentication failed (${status}). Check your API key. (${raw})`;
  }
  if (status === 429) {
    return `Rate limited (429). Please wait a moment and retry. (${raw})`;
  }
  if (status && status >= 500) {
    return `Provider error (${status}). Please retry. (${raw})`;
  }
  if (/timeout|timed out|abort|network|fetch|failed to fetch/i.test(raw)) {
    return `Provider unreachable. Check your connection and try again. (${raw})`;
  }
  return `Error: ${raw}`;
}
