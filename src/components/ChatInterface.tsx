import { useState, useRef, useEffect, useContext } from "preact/hooks";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import snarkdown from 'snarkdown';
import { useChat } from "../hooks/useChat";
import { AppConfigContext } from "../App";

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const config = useContext(AppConfigContext)
  const { messages, clearMessages, loading, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTips = (text: string) => () => {
    sendMessage(text);
  }

  const renderContent = (content: string) => {
    const html = snarkdown(content);
    return <p class="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <aside key={config.pos} class={`fixed ${config.pos === 'right' ? 'right-margin-desktop' : 'left-margin-desktop'} top-margin-desktop bottom-margin-desktop w-panel-width rounded-xl glass-panel shadow-2xl shadow-black/5 flex flex-col overflow-hidden z-50 animate-slide-up`}>
      <div class="p-6 border-b border-black/5 flex flex-col gap-4 shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 relative flex items-center justify-center bg-white/60 backdrop-blur-md border border-black/5 rounded-full shadow-sm transition-all group/logo">
              <div class="iris-scanner" />
              <div class="orb-outer">
                <div class="orb-inner" />
                <div class="interaction-text">Klunq</div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="New Chat" onClick={() => !loading && clearMessages()}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
            <button class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="Switch Position" onClick={config.togglePosition}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>
            <button class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        {messages
          .filter(
            (msg) =>
              (msg instanceof AIMessage || msg instanceof HumanMessage) &&
              msg.content !== "",
          )
          .map((msg, i) => (
            <div key={i} class="flex flex-col items-start gap-2">
              <div
                class={
                  msg instanceof AIMessage
                    ? "glass-bubble p-4 rounded-2xl rounded-tl-none max-w-[85%] inner-glow-top prose"
                    : "self-end bg-primary text-on-primary p-4 rounded-2xl rounded-br-none max-w-[85%] prose prose-invert"
                }
              >
                {renderContent(String(msg.content))}
              </div>
            </div>
          ))}
        {loading && (
          <div class="flex flex-col items-start gap-2">
            <div class="glass-bubble p-4 rounded-2xl rounded-tl-none max-w-[85%] inner-glow-top animate-pulse">
              <p class="leading-relaxed">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div class="p-6 pt-0 shrink-0">
        {messages.length === 1 && (<div class="flex flex-wrap gap-2 mb-3">
          <button onClick={handleTips('click to next section')} class="px-3 py-1.5 rounded-lg border border-black/5 bg-black/5 hover:bg-black/10 text-on-surface-variant hover:text-on-surface text-[11px] font-label-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95">
            click to next section
          </button>
          <button onClick={handleTips('extract data table')} class="px-3 py-1.5 rounded-lg border border-black/5 bg-black/5 hover:bg-black/10 text-on-surface-variant hover:text-on-surface text-[11px] font-label-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95">
            extract data table
          </button>
          <button onClick={handleTips('find actions')} class="px-3 py-1.5 rounded-lg border border-black/5 bg-black/5 hover:bg-black/10 text-on-surface-variant hover:text-on-surface text-[11px] font-label-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95">
            find actions
          </button>
          <button onClick={handleTips('scrape form fields')} class="px-3 py-1.5 rounded-lg border border-black/5 bg-black/5 hover:bg-black/10 text-on-surface-variant hover:text-on-surface text-[11px] font-label-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95">
            scrape form fields
          </button>
        </div>)}

        <div class="relative group flex flex-col gap-2.5">
          <div class="absolute inset-0 bg-primary/5 rounded-xl blur-lg group-focus-within:bg-primary/10 transition-all"></div>

          {/* Outer wrapper max-h-[50%] respects the 'aside' parent context */}
          <div class="relative flex flex-col bg-white/80 border border-black/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors max-h-[50vh]">
            <textarea
              ref={textAreaRef}
              value={input}
              onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              class="w-full bg-transparent border-none focus:ring-0 text-on-surface text-body-md p-4 resize-none min-h-24 placeholder:text-on-surface-variant/40 overflow-y-auto block"
              placeholder="Ask anything..."
            />
          </div>

          <div class="flex justify-between z-10 w-full">
            {/* <div class="flex gap-1"></div> */}
            <div class="flex flex-1 gap-2 w-full">
              <button onClick={async (e) => {
                e.preventDefault();
                if (loading) return;
                await sendMessage("Summarize this page");
              }} class="flex-1 px-3 py-2.5 text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-md border border-primary/50 hover:border-primary/80 transition-colors cursor-pointer">
                Summarize
              </button>
              <button
                onClick={handleSend}
                class="flex-1 px-3 py-2.5 text-xs font-bold bg-primary text-on-primary rounded-md shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}