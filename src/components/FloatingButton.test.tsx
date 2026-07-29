// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/preact';
import FloatingButton from './FloatingButton';
import { AppConfigContext } from '../App';

afterEach(cleanup);

function renderWithPos(pos: string) {
  return render(
    <AppConfigContext.Provider value={{ pos, togglePosition: vi.fn() }}>
      <FloatingButton onClick={vi.fn()} />
    </AppConfigContext.Provider>,
  );
}

describe('FloatingButton', () => {
  it('renders with aria-label', () => {
    renderWithPos('right');
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <AppConfigContext.Provider value={{ pos: 'right', togglePosition: vi.fn() }}>
        <FloatingButton onClick={onClick} />
      </AppConfigContext.Provider>,
    );
    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with right position classes', () => {
    renderWithPos('right');
    const container = screen.getByLabelText('Open chat').parentElement;
    expect(container?.className).toContain('right-15');
  });

  it('renders with left position classes', () => {
    renderWithPos('left');
    const container = screen.getByLabelText('Open chat').parentElement;
    expect(container?.className).toContain('left-15');
  });
});
