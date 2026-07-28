import { createContext } from 'preact';
import { Dispatch, StateUpdater, useState } from 'preact/hooks';
import { AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

import FloatingButton from './components/FloatingButton';
import ChatInterface from './components/ChatInterface';
import { ModelConfig } from './agent/agent';
import { ConnectionInfo, useConnectionStatus } from './hooks/useConnectionStatus';

export const ModelConfigContext = createContext<ModelConfig | undefined>(undefined);

export const AppConfigContext = createContext({
  pos: 'right',
  togglePosition: () => { }
});

export const ConnectionStatusContext = createContext<ConnectionInfo>({
  status: 'checking',
  errorMessage: '',
  lastPingAt: null,
});

interface MessagesContextInterface {
  messages: BaseMessage[];
  setMessages: Dispatch<StateUpdater<BaseMessage[]>>;
  loading: boolean;
  setLoading: Dispatch<StateUpdater<boolean>>;
}
export const MessagesContext = createContext<MessagesContextInterface | undefined>(undefined);

export default function App({ modelConfig }: { modelConfig: ModelConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState('right');
  const [messages, setMessages] = useState<BaseMessage[]>([
    new AIMessage('I am observing. How shall I assist you with this page?')
  ]);
  const [loading, setLoading] = useState(false);
  const connectionInfo = useConnectionStatus(modelConfig);

  const togglePosition = () => {
    setPos(pos === 'right' ? 'left' : 'right');
  }

  return (
    <ModelConfigContext.Provider value={modelConfig}>
      <ConnectionStatusContext.Provider value={connectionInfo}>
        <AppConfigContext.Provider value={{ pos, togglePosition }}>
          <MessagesContext.Provider value={{ messages, setMessages, loading, setLoading }} >
            {!isOpen && <FloatingButton onClick={() => setIsOpen(true)} />}
            {isOpen && <ChatInterface onClose={() => setIsOpen(false)} />}
          </MessagesContext.Provider>
        </AppConfigContext.Provider>
      </ConnectionStatusContext.Provider>
    </ModelConfigContext.Provider>
  );
}
