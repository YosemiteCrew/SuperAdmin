import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

import { CommandPalette, COMMAND_PALETTE_EVENT } from '@/app/ui/overlays/CommandPalette';
import { NAV_ROUTES } from '@/app/ui/layout/nav';

const searchMock = jest.fn();
jest.mock('@/app/ui/overlays/CommandPalette/searchAction', () => ({
  searchDirectoryAction: (...args: unknown[]) => searchMock(...args),
}));

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
    searchMock.mockReset();
    searchMock.mockResolvedValue([]);
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
    const dialog = screen.getByRole('dialog');
    const input = screen.getByLabelText(/command palette input/i);
    // The panel keeps its own surface tokens; the veil moved onto the dialog's
    // ::backdrop when the overlay became a real modal (#552).
    const panel = input.closest('.max-w-2xl');
    expect(panel).toHaveClass('shadow-[0_28px_70px_var(--sh12)]');
    expect(panel).toHaveClass('border-[var(--ink-faint)]/80');
    expect(dialog).toHaveClass('backdrop:bg-[var(--glass-93)]');
    expect(dialog).toHaveClass('backdrop:backdrop-blur-[8px]');
    expect(input.parentElement).toHaveClass('shadow-[inset_0_1px_0_var(--hairline-soft)]');
    expect(input.parentElement?.parentElement).toHaveClass('bg-[var(--blue-soft)]');
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
    const dashboard = screen.getByRole('button', { name: /Open Dashboard/i });
    expect(dashboard).toHaveAttribute('aria-current', 'true');
    expect(dashboard).toHaveClass('bg-[var(--blue-soft)]');
    expect(dashboard.className).not.toContain('linear-gradient');
    press('ArrowDown');
    const users = screen.getByRole('button', { name: /Open Users/i });
    expect(users).toHaveAttribute('aria-current', 'true');
    expect(dashboard).toHaveClass('hover:border-[var(--blue)]/25', 'hover:bg-surface/78');
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

describe('CommandPalette live directory search', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    });
    searchMock.mockReset();
  });

  it('surfaces live user and org hits above static results', async () => {
    searchMock.mockResolvedValue([
      { id: 'u1', kind: 'user', title: 'pet@owner.com', href: '/users/u1' },
      { id: 'o1', kind: 'organization', title: 'Happy Paws Clinic', href: '/organizations/o1' },
    ]);
    render(<CommandPalette />);
    openPalette();
    act(() => {
      fireEvent.change(screen.getByLabelText('Command palette input'), {
        target: { value: 'pet' },
      });
    });

    expect(await screen.findByText('pet@owner.com')).toBeInTheDocument();
    expect(screen.getByText('Happy Paws Clinic')).toBeInTheDocument();
    expect(searchMock).toHaveBeenCalledWith('pet');
  });

  it('does not query the directory for a single character', async () => {
    searchMock.mockResolvedValue([]);
    render(<CommandPalette />);
    openPalette();
    act(() => {
      fireEvent.change(screen.getByLabelText('Command palette input'), {
        target: { value: 'p' },
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('drops live hits when the directory search rejects', async () => {
    searchMock.mockRejectedValue(new Error('down'));
    render(<CommandPalette />);
    openPalette();
    act(() => {
      fireEvent.change(screen.getByLabelText('Command palette input'), {
        target: { value: 'pet' },
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(screen.queryByText('pet@owner.com')).not.toBeInTheDocument();
  });
});

describe('CommandPalette page search covers the whole sidebar', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockClear();
    searchMock.mockReset();
    searchMock.mockResolvedValue([]);
    (useRouter as jest.Mock).mockReturnValue({
      push,
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    });
  });

  // Iterating the exported list is the point: a route added to the sidebar is
  // covered here the moment it lands, so the palette cannot fall behind again.
  it.each(NAV_ROUTES.map((route) => [route.name, route.href]))(
    'finds %s by its sidebar name',
    async (name) => {
      const user = userEvent.setup();
      render(<CommandPalette />);
      openPalette();
      await user.type(screen.getByLabelText(/command palette input/i), name);
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  );

  it('groups Consent and Data requests under a privacy search', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByLabelText(/command palette input/i), 'privacy');
    expect(screen.getByText('Consent')).toBeInTheDocument();
    expect(screen.getByText('Data requests')).toBeInTheDocument();
  });

  it('finds Data requests by gdpr', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByLabelText(/command palette input/i), 'gdpr');
    expect(screen.getByText('Data requests')).toBeInTheDocument();
  });

  it('opens the audit log from its result row', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByLabelText(/command palette input/i), 'audit log');
    await user.click(screen.getByRole('button', { name: /Audit log/i }));
    expect(push).toHaveBeenCalledWith('/audit');
  });

  it('keeps exactly the five empty-query quick links', () => {
    render(<CommandPalette />);
    openPalette();
    const quickLinks = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((label) => label.startsWith('Open '));
    expect(quickLinks).toHaveLength(5);
    for (const title of [
      'Open Dashboard',
      'Open Users',
      'Open Organizations',
      'Open Analytics',
      'Open Settings',
    ]) {
      // Matched as text rather than through a RegExp built from a variable:
      // the badge and subtitle are part of the button's accessible name, so an
      // exact name match would not work, and a dynamic pattern is a needless
      // sink for a list of literals.
      expect(screen.getByText(title).closest('button')).toBeInTheDocument();
    }
  });
});

describe('CommandPalette Enter activates the row the operator is on', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockClear();
    searchMock.mockReset();
    searchMock.mockResolvedValue([]);
    (useRouter as jest.Mock).mockReturnValue({
      push,
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    });
  });

  const openAndWaitForInput = async () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByLabelText(/command palette input/i);
    await waitFor(() => expect(input).toHaveFocus());
    return input;
  };

  it('opens the tabbed-to quick link, not the highlighted one', async () => {
    const user = userEvent.setup();
    await openAndWaitForInput();

    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: /Open Organizations/i })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/organizations');
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('opens the tabbed-to live directory hit', async () => {
    searchMock.mockResolvedValue([
      { id: 'u1', kind: 'user', title: 'first@example.test', href: '/users/u1' },
      { id: 'u2', kind: 'user', title: 'second@example.test', href: '/users/u2' },
      { id: 'u3', kind: 'user', title: 'third@example.test', href: '/users/u3' },
    ]);
    const user = userEvent.setup();
    const input = await openAndWaitForInput();
    await user.type(input, 'example');
    expect(await screen.findByText('third@example.test')).toBeInTheDocument();

    await user.tab();
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/users/u3');
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('moves the highlight onto a row that receives keyboard focus', async () => {
    const user = userEvent.setup();
    await openAndWaitForInput();

    await user.tab();
    await user.tab();
    const users = screen.getByRole('button', { name: /Open Users/i });
    expect(users).toHaveFocus();
    expect(users).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Open Dashboard/i })).not.toHaveAttribute(
      'aria-current'
    );
  });

  // The onFocus highlight sync alone already sends Enter to the right row, so
  // these two assertions are what give the guard in the Enter branch a failing
  // example: a focused row must keep its own native activation, and the input
  // must keep handing Enter to the highlight.
  it('leaves Enter on a focused row for the browser to activate', async () => {
    const user = userEvent.setup();
    await openAndWaitForInput();
    await user.tab();

    const row = screen.getByRole('button', { name: /Open Dashboard/i });
    expect(row).toHaveFocus();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => {
      row.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
  });

  it('still cancels Enter in the search input so the highlight is used', async () => {
    const input = await openAndWaitForInput();
    expect(input).toHaveFocus();

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => {
      input.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('activates a focused row with Space as well as Enter', async () => {
    const user = userEvent.setup();
    await openAndWaitForInput();

    await user.tab();
    await user.tab();
    await user.keyboard('{ }');
    expect(push).toHaveBeenCalledWith('/users');
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe('CommandPalette is a real modal', () => {
  beforeEach(() => {
    searchMock.mockReset();
    searchMock.mockResolvedValue([]);
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('opens through showModal, not the open attribute', () => {
    const showModal = jest.spyOn(HTMLDialogElement.prototype, 'showModal');
    render(<CommandPalette />);
    openPalette();
    expect(showModal).toHaveBeenCalledTimes(1);
    showModal.mockRestore();
  });

  it('returns focus to the control that opened it', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Search';
    document.body.append(opener);
    opener.focus();

    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Control: focus must actually LEAVE the opener first, or the assertion
    // below passes on a palette that never restores anything.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(/command palette input/i))
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('closes when the click lands on the dialog outside its panel', () => {
    render(<CommandPalette />);
    openPalette();
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
