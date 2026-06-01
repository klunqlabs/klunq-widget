import { useState } from 'preact/hooks';
import FloatingButton from './components/FloatingButton';
import ChatInterface from './components/ChatInterface';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && <FloatingButton onClick={() => setIsOpen(true)} />}
      {isOpen && <ChatInterface onClose={() => setIsOpen(false)} />}
    </>
  );
}
