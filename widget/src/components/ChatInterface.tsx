import { useState } from 'preact/hooks';
import type { ChatMessage } from '../types';
import { agent } from '../agent/agent';
import { BaseMessage } from 'langchain';

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await agent.invoke({ messages: history });
      const messages  = reply.messages as BaseMessage[];
      const last = messages.at(-1)?.text;
      setMessages((prev) => [...prev, { role: 'assistant', content: last ?? 'Content not found.' }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
    }
    setLoading(false);
  };

  return (
    <div class="clank-chat">
      <div class="clank-chat-header">
        <span>Clank AI</span>
        <button onClick={onClose} aria-label="Close chat">&times;</button>
      </div>
      <div class="clank-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} class={`clank-message clank-message-${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div class="clank-message clank-message-assistant clank-message-loading">
            Thinking...
          </div>
        )}
      </div>
      <div class="clank-chat-input">
        <input
          type="text"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
