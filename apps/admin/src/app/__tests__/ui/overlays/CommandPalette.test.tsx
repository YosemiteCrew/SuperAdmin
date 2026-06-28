import { fireEvent, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

import { CommandPalette, COMMAND_PALETTE_EVENT } from '@/app/ui/overlays/CommandPalette';

function openPalette() {
  act(() => {
    document.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
  });
}

const press = (key: string) =>
  act(() => {
    fireEvent.keyDown(document, { key });
  });

describe('CommandPalette', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push,
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    });
  });
  it('does not render until opened', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens via the custom event', () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens via ⌘K keyboard shortcut', () => {
    render(<CommandPalette />);
    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<CommandPalette />);
    openPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows all quick links by default', () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole('button', { name: /Open Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Users/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Settings/i })).toBeInTheDocument();
  });

  it('filters items by query', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByLabelText(/command palette input/i) as HTMLInputElement;
    await user.type(input, 'metrics');
    expect(screen.getByRole('button', { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Settings/i })).not.toBeInTheDocument();
  });

  it('shows empty state when no items match', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByLabelText(/command palette input/i) as HTMLInputElement;
    await user.type(input, 'qqqxxxnomatch');
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
  });

  it('moves the active row with ArrowDown and wraps with ArrowUp', () => {
    render(<CommandPalette />);
    openPalette();
    // First quick link is active by default.
    expect(screen.getByRole('button', { name: /Open Dashboard/i })).toHaveAttribute(
      'aria-current',
      'true'
    );
    press('ArrowDown');
    expect(screen.getByRole('button', { name: /Open Users/i })).toHaveAttribute(
      'aria-current',
      'true'
    );
    // From the first row, ArrowUp wraps to the last quick link.
    press('ArrowUp');
    press('ArrowUp');
    expect(screen.getByRole('button', { name: /Open Settings/i })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('activates a row on mouse enter', () => {
    render(<CommandPalette />);
    openPalette();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Open Analytics/i }));
    expect(screen.getByRole('button', { name: /Open Analytics/i })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('navigates and closes when the active row is selected with Enter', () => {
    render(<CommandPalette />);
    openPalette();
    press('Enter');
    expect(push).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates and closes when a row is clicked', () => {
    render(<CommandPalette />);
    openPalette();
    fireEvent.click(screen.getByRole('button', { name: /Open Settings/i }));
    expect(push).toHaveBeenCalledWith('/settings');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
