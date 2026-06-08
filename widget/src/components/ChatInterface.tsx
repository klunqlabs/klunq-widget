import { useState } from 'preact/hooks';
import { AIMessage, HumanMessage } from 'langchain';
import { useChat } from '../hooks/useChat';

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { messages, loading, sendMessage } = useChat();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    await sendMessage(text);
  };


  return (
    <div class="clank-chat">
      <div class="clank-chat-header">
        <span>Clank AI</span>
        <button onClick={onClose} aria-label="Close chat">&times;</button>
      </div>
      <div class="clank-chat-messages">
        {messages
          .filter((msg) => (msg instanceof AIMessage || msg instanceof HumanMessage) && msg.content !== '')
          .map((msg, i) => (
            <div key={i} class={`clank-message clank-message-${msg instanceof AIMessage ? 'assistant' : 'user'}`}>
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
