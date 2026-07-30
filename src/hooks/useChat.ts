import { useContext, useRef } from "preact/hooks";
import { getAgent } from "../agent/agent";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MessagesContext, ModelConfigContext } from "../App";

export function useChat() {
  const modelConfigContext = useContext(ModelConfigContext);

  if (modelConfigContext === undefined) {
    throw new Error('useChat must be used within a ModelConfigContext.Provider');
  }

  const agent = useRef(getAgent(modelConfigContext));

  const messageContext = useContext(MessagesContext);

  if (messageContext === undefined) {
    throw new Error('useChat must be used within a MessagesContext.Provider');
  }

  const { messages, setMessages, loading, setLoading } = messageContext;

  const sendMessage = async (text: string) => {
    const userMsg = new HumanMessage(text);
    const updatedMessages = [...messages, userMsg]

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const reply = await agent.current.invoke({ messages: updatedMessages });
      setMessages((_) => reply.messages);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [...prev, new AIMessage(`Error: ${errorMsg}`)]);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages(messages.slice(0, 1));
  }

  return { messages, clearMessages, loading, sendMessage };
}