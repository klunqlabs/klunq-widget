import { useState } from 'preact/hooks';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [messages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setInput('');
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
