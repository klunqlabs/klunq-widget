// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { useConnectionStatus } from './useConnectionStatus';
import type { ModelConfig } from '../agent/agent';

const mockPingModel = vi.hoisted(() => vi.fn());
vi.mock('../agent/agent', () => ({ pingModel: mockPingModel }));

afterEach(() => {
  mockPingModel.mockReset();
  cleanup();
});

function harness(config: ModelConfig) {
  function Harness() {
    const info = useConnectionStatus(config);
    return (
      <div>
        <span data-testid="status">{info.status}</span>
        <span data-testid="error">{info.errorMessage}</span>
      </div>
    );
  }
  return render(<Harness />);
}

describe('useConnectionStatus', () => {
  it('starts as checking', () => {
    mockPingModel.mockResolvedValue({ ok: true });
    const { getByTestId } = harness({ model: 'm', apiKey: 'key', baseURL: 'u' });
    expect(getByTestId('status').textContent).toBe('checking');
  });

  it('sets no_key when apiKey is empty', async () => {
    const { getByTestId } = harness({ model: 'm', apiKey: '', baseURL: 'u' });
    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('no_key');
    });
  });

  it('sets no_key when apiKey is whitespace', async () => {
    const { getByTestId } = harness({ model: 'm', apiKey: '   ', baseURL: 'u' });
    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('no_key');
    });
  });

  it('sets online when pingModel returns ok', async () => {
    mockPingModel.mockResolvedValue({ ok: true });
    const { getByTestId } = harness({ model: 'm', apiKey: 'key', baseURL: 'u' });
    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('online');
    });
  });

  it('sets error when pingModel returns error with message', async () => {
    mockPingModel.mockResolvedValue({ ok: false, error: '401 Unauthorized' });
    const { getByTestId } = harness({ model: 'm', apiKey: 'key', baseURL: 'u' });
    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('error');
    });
    expect(getByTestId('error').textContent).toBe('401 Unauthorized');
  });

  it('sets error with fallback message when pingModel returns error without message', async () => {
    mockPingModel.mockResolvedValue({ ok: false });
    const { getByTestId } = harness({ model: 'm', apiKey: 'key', baseURL: 'u' });
    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('error');
    });
    expect(getByTestId('error').textContent).toBe('Failed to reach the model API');
  });
});
