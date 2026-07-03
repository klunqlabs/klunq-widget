import { createContext } from 'preact';
import { Dispatch, StateUpdater, useState } from 'preact/hooks';
import { AIMessage, BaseMessage } from 'langchain';

import FloatingButton from './components/FloatingButton';
import ChatInterface from './components/ChatInterface';

export const AppConfigContext = createContext({
  pos: 'right',
  togglePosition: () => { }
});

interface MessagesContextInterface {
  messages: BaseMessage[];
  setMessages: Dispatch<StateUpdater<BaseMessage[]>>;
  loading: boolean;
  setLoading: Dispatch<StateUpdater<boolean>>;
}
export const MessagesContext = createContext<MessagesContextInterface | undefined>(undefined);

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState('right');
  const [messages, setMessages] = useState<BaseMessage[]>([
    new AIMessage('I am observing. How shall I assist you with this page?')
  ]);
  const [loading, setLoading] = useState(false);

  const togglePosition = () => {
    setPos(pos === 'right' ? 'left' : 'right');
  }

  return (
    <AppConfigContext.Provider value={{ pos, togglePosition }}>
      <MessagesContext.Provider value={{ messages, setMessages, loading, setLoading }} >
        {!isOpen && <FloatingButton onClick={() => setIsOpen(true)} />}
        {isOpen && <ChatInterface onClose={() => setIsOpen(false)} />}
      </MessagesContext.Provider>
    </AppConfigContext.Provider>
  );
}
