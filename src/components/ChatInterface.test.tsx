// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/preact';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import ChatInterface from './ChatInterface';
import { AppConfigContext, ConnectionStatusContext } from '../App';
import type { ConnectionInfo } from '../hooks/useConnectionStatus';

afterEach(() => {
  cleanup();
  mockUseChat.mockReset();
});

const mockUseChat = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useChat', () => ({ useChat: mockUseChat }));

const defaultConn: ConnectionInfo = {
  status: 'online',
  errorMessage: '',
  lastPingAt: Date.now(),
};

function renderChatInterface(overrides?: {
  messages?: any[];
  loading?: boolean;
  conn?: ConnectionInfo;
}) {
  const {
    messages = [new AIMessage('I am observing.')],
    loading = false,
    conn = defaultConn,
  } = overrides ?? {};

  mockUseChat.mockReturnValue({
    messages,
    clearMessages: vi.fn(),
    loading,
    sendMessage: vi.fn(),
  });

  return render(
    <ConnectionStatusContext.Provider value={conn}>
      <AppConfigContext.Provider value={{ pos: 'right', togglePosition: vi.fn() }}>
        <ChatInterface onClose={vi.fn()} />
      </AppConfigContext.Provider>
    </ConnectionStatusContext.Provider>,
  );
}

describe('ChatInterface', () => {
  it('renders welcome AI message', () => {
    renderChatInterface();
    expect(screen.getByText('I am observing.')).toBeInTheDocument();
  });

  it('shows Thinking... indicator when loading', () => {
    renderChatInterface({ loading: true });
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('hides Thinking... when not loading', () => {
    renderChatInterface({ loading: false });
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
  });

  it('shows tip buttons when only 1 message (welcome)', () => {
    renderChatInterface({ messages: [new AIMessage('Welcome')] });
    expect(screen.getByText('click to next section')).toBeInTheDocument();
    expect(screen.getByText('extract data table')).toBeInTheDocument();
  });

  it('hides tip buttons when multiple messages', () => {
    renderChatInterface({
      messages: [
        new AIMessage('Welcome'),
        new HumanMessage('Hi'),
      ],
    });
    expect(screen.queryByText('click to next section')).not.toBeInTheDocument();
  });

  it('enables Execute button when online and not loading', () => {
    renderChatInterface({ loading: false, conn: { ...defaultConn, status: 'online' } });
    expect(screen.getByText('Execute')).not.toBeDisabled();
  });

  it('disables Execute button when offline', () => {
    renderChatInterface({ loading: false, conn: { ...defaultConn, status: 'error', errorMessage: 'fail' } });
    expect(screen.getByText('Execute')).toBeDisabled();
  });

  it('disables Execute button when loading', () => {
    renderChatInterface({ loading: true });
    expect(screen.getByText('Execute')).toBeDisabled();
  });

  it('renders HumanMessage in user bubble', () => {
    renderChatInterface({
      messages: [
        new AIMessage('Welcome'),
        new HumanMessage('My question'),
      ],
    });
    expect(screen.getByText('My question')).toBeInTheDocument();
  });

  it('filters out empty content messages', () => {
    const { container } = renderChatInterface({
      messages: [
        new AIMessage(''),
        new AIMessage('Visible'),
      ],
    });
    expect(screen.getByText('Visible')).toBeInTheDocument();
    const bubbles = container.querySelectorAll('.glass-bubble');
    expect(bubbles).toHaveLength(1);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    mockUseChat.mockReturnValue({
      messages: [new AIMessage('Hi')],
      clearMessages: vi.fn(),
      loading: false,
      sendMessage: vi.fn(),
    });
    render(
      <ConnectionStatusContext.Provider value={defaultConn}>
        <AppConfigContext.Provider value={{ pos: 'right', togglePosition: vi.fn() }}>
          <ChatInterface onClose={onClose} />
        </AppConfigContext.Provider>
      </ConnectionStatusContext.Provider>,
    );
    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('input and send', () => {
    function renderWithSendSpy() {
      const sendMessage = vi.fn().mockResolvedValue(undefined);
      mockUseChat.mockReturnValue({
        messages: [new AIMessage('Hi')],
        clearMessages: vi.fn(),
        loading: false,
        sendMessage,
      });
      const view = render(
        <ConnectionStatusContext.Provider value={defaultConn}>
          <AppConfigContext.Provider value={{ pos: 'right', togglePosition: vi.fn() }}>
            <ChatInterface onClose={vi.fn()} />
          </AppConfigContext.Provider>
        </ConnectionStatusContext.Provider>,
      );
      const textarea = view.getByPlaceholderText('Ask anything...') as HTMLTextAreaElement;
      return { ...view, textarea, sendMessage };
    }

    it('calls sendMessage with input text when Execute is clicked', async () => {
      const { textarea, sendMessage } = renderWithSendSpy();
      fireEvent.input(textarea, { target: { value: 'hello world' } });
      fireEvent.click(screen.getByText('Execute'));
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('hello world');
      });
    });

    it('calls sendMessage when Enter is pressed with text', async () => {
      const { textarea, sendMessage } = renderWithSendSpy();
      fireEvent.input(textarea, { target: { value: 'enter text' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('enter text');
      });
    });

    it('does not call sendMessage on Shift+Enter', async () => {
      const { textarea, sendMessage } = renderWithSendSpy();
      fireEvent.input(textarea, { target: { value: 'shift enter' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      await waitFor(() => expect(sendMessage).not.toHaveBeenCalled());
    });

    it('does not call sendMessage when Execute clicked with empty input', async () => {
      const { sendMessage } = renderWithSendSpy();
      fireEvent.click(screen.getByText('Execute'));
      await waitFor(() => expect(sendMessage).not.toHaveBeenCalled());
    });
  });
});
