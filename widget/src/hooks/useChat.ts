import { useState } from "preact/hooks";
import { agent } from "../agent/agent";
import { AIMessage, HumanMessage, BaseMessage } from "langchain";

export function useChat() {
  const [messages, setMessages] = useState<BaseMessage[]>([
    new AIMessage('Hello! How can I help you today?')
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const userMsg = new HumanMessage(text);
    const updatedMessages = [...messages, userMsg]

    setMessages((prev) => updatedMessages);
    setLoading(true);

    try {
      const reply = await agent.invoke({ messages: updatedMessages });
      setMessages((_) => reply.messages);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [...prev, new AIMessage(`Error: ${errorMsg}`)]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
}