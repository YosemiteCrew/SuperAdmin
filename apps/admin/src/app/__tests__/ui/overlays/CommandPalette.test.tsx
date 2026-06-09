import { fireEvent, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CommandPalette, COMMAND_PALETTE_EVENT } from '@/app/ui/overlays/CommandPalette';

function openPalette() {
  act(() => {
    document.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
  });
}

describe('CommandPalette', () => {
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
    expect(screen.getByRole('option', { name: /Open Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Open Users/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Open Settings/i })).toBeInTheDocument();
  });

  it('filters items by query', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByLabelText(/command palette input/i) as HTMLInputElement;
    await user.type(input, 'metrics');
    expect(screen.getByRole('option', { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Settings/i })).not.toBeInTheDocument();
  });

  it('shows empty state when no items match', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByLabelText(/command palette input/i) as HTMLInputElement;
    await user.type(input, 'qqqxxxnomatch');
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
  });
});
