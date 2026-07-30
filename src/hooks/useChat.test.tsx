// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'preact/hooks';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { useChat } from './useChat';
import { ModelConfigContext, MessagesContext } from '../App';
import type { ModelConfig } from '../agent/agent';

const mockInvoke = vi.hoisted(() => vi.fn());
const mockGetAgent = vi.hoisted(() => vi.fn().mockReturnValue({ invoke: mockInvoke }));
vi.mock('../agent/agent', () => ({
  getAgent: mockGetAgent,
}));

afterEach(cleanup);
beforeEach(() => {
  mockInvoke.mockReset();
  mockGetAgent.mockClear();
});

const modelConfig: ModelConfig = { model: 'm', apiKey: 'k', baseURL: 'u' };
const welcome = new AIMessage('Welcome');

function harness(initialMessages: BaseMessage[] = [welcome]) {
  function Harness({ msgs: init }: { msgs: BaseMessage[] }) {
    const [msgs, setMsgs] = useState<BaseMessage[]>(init);
    const [loading, setLoading] = useState(false);
    return (
      <ModelConfigContext.Provider value={modelConfig}>
        <MessagesContext.Provider value={{ messages: msgs, setMessages: setMsgs, loading, setLoading }}>
          <Consumer />
        </MessagesContext.Provider>
      </ModelConfigContext.Provider>
    );
  }
  function Consumer() {
    const { messages, loading, sendMessage, clearMessages } = useChat();
    return (
      <div>
        <span data-testid="count">{messages.length}</span>
        <span data-testid="loading">{String(loading)}</span>
        <button data-testid="send" onClick={() => sendMessage('hi')}>Send</button>
        <button data-testid="clear" onClick={clearMessages}>Clear</button>
      </div>
    );
  }
  return render(<Harness msgs={initialMessages} />);
}

describe('useChat', () => {
  it('throws outside ModelConfigContext', () => {
    const stderr = console.error;
    console.error = vi.fn();
    function Bad() { useChat(); return null; }
    expect(() => render(<Bad />)).toThrow('useChat must be used within a ModelConfigContext.Provider');
    console.error = stderr;
  });

  it('throws outside MessagesContext', () => {
    const stderr = console.error;
    console.error = vi.fn();
    function Bad() {
      useChat();
      return null;
    }
    expect(() =>
      render(
        <ModelConfigContext.Provider value={modelConfig}>
          <Bad />
        </ModelConfigContext.Provider>,
      ),
    ).toThrow('useChat must be used within a MessagesContext.Provider');
    console.error = stderr;
  });

  it('starts with initial message count and not loading', () => {
    const { getByTestId } = harness([welcome]);
    expect(getByTestId('count').textContent).toBe('1');
    expect(getByTestId('loading').textContent).toBe('false');
  });

  it('updates state with agent reply on send', async () => {
    mockInvoke.mockResolvedValue({ messages: [welcome, new AIMessage('Reply')] });
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId('send'));
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('2');
    });
  });

  it('sets loading true while waiting for agent then false after', async () => {
    let resolve: (v: { messages: BaseMessage[] }) => void;
    mockInvoke.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId('send'));
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('true');
    });
    resolve!({ messages: [welcome, new AIMessage('Done')] });
    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false');
    });
  });

  it('adds an error message when agent invoke fails', async () => {
    mockInvoke.mockRejectedValue(new Error('API error'));
    const { getByTestId } = harness([welcome]);
    fireEvent.click(getByTestId('send'));
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('2');
    });
  });

  it('clearMessages keeps only the first message', () => {
    const extra = new AIMessage('Extra');
    const { getByTestId } = harness([welcome, extra]);
    expect(getByTestId('count').textContent).toBe('2');
    fireEvent.click(getByTestId('clear'));
    expect(getByTestId('count').textContent).toBe('1');
  });

  it('creates agent once with the model config from context', () => {
    harness([welcome]);
    expect(mockGetAgent).toHaveBeenCalledTimes(1);
    expect(mockGetAgent).toHaveBeenCalledWith(modelConfig);
  });
});
