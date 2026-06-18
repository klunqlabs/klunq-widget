import { useState } from "preact/hooks";
import { AIMessage, HumanMessage } from "langchain";
import { useChat } from "../hooks/useChat";

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { messages, loading, sendMessage } = useChat();
  const [input, setInput] = useState("");

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  };

  return (
    <div class="fixed bottom-18 right-6 w-90 h-125 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
      <div class="flex items-center justify-between px-4 py-3 bg-indigo-500 text-white font-semibold shrink-0">
        <span>Clank AI</span>
        <button
          class="bg-transparent border-0 text-white text-2xl cursor-pointer leading-none p-0"
          onClick={onClose}
          aria-label="Close chat"
        >
          &times;
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages
          .filter(
            (msg) =>
              (msg instanceof AIMessage || msg instanceof HumanMessage) &&
              msg.content !== "",
          )
          .map((msg, i) => (
            <div
              key={i}
              class={
                msg instanceof AIMessage
                  ? "max-w-[80%] self-start px-3 py-2 rounded-xl bg-slate-100 text-slate-800 rounded-bl-sm text-sm leading-relaxed wrap-break-word"
                  : "max-w-[80%] self-end px-3 py-2 rounded-xl bg-indigo-500 text-white rounded-br-sm text-sm leading-relaxed wrap-break-word"
              }
            >
              {String(msg.content)}
            </div>
          ))}
        {loading && (
          <div class="max-w-[80%] self-start px-3 py-2 rounded-xl bg-slate-100 text-slate-800 rounded-bl-sm text-sm leading-relaxed animate-pulse">
            Thinking...
          </div>
        )}
      </div>

      <div class="flex gap-2 px-4 py-3 border-t border-slate-200 shrink-0">
        <input
          type="text"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder="Type a message..."
          class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button
          class="bg-indigo-500 text-white border-0 rounded-lg px-4 py-2 cursor-pointer font-medium text-sm hover:bg-indigo-600 active:bg-indigo-700"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
