import { fireEvent, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UserRowActions } from '@/app/(routes)/(dashboard)/users/UserRowActions';

jest.mock('@/app/(routes)/(dashboard)/users/actions', () => ({
  deleteUserAction: jest.fn(),
}));

describe('UserRowActions', () => {
  const originalConfirm = globalThis.confirm;

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  it('renders only the trigger button initially (menu closed)', () => {
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    expect(screen.getByRole('button', { name: /Actions for a@b\.com/i })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    await user.click(screen.getByRole('button', { name: /Actions for a@b\.com/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /View details/i })).toHaveAttribute(
      'href',
      '/users/user-1'
    );
    expect(screen.getByRole('menuitem', { name: /Delete/i })).toBeInTheDocument();
  });

  it('toggles closed when the trigger is clicked twice', async () => {
    const user = userEvent.setup();
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    const trigger = screen.getByRole('button', { name: /Actions for a@b\.com/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    await user.click(screen.getByRole('button', { name: /Actions for a@b\.com/i }));
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('cancels the delete submit if user dismisses the confirm', async () => {
    globalThis.confirm = jest.fn(() => false);
    const user = userEvent.setup();
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    await user.click(screen.getByRole('button', { name: /Actions for a@b\.com/i }));
    const deleteBtn = screen.getByRole('menuitem', { name: /Delete/i });
    fireEvent.submit(deleteBtn.closest('form') as HTMLFormElement);
    expect(globalThis.confirm).toHaveBeenCalled();
    // Menu stays open since the form submit was prevented
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('proceeds with delete and closes the menu when the confirm is accepted', async () => {
    globalThis.confirm = jest.fn(() => true);
    const user = userEvent.setup();
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    await user.click(screen.getByRole('button', { name: /Actions for a@b\.com/i }));
    const deleteBtn = screen.getByRole('menuitem', { name: /Delete/i });
    act(() => {
      fireEvent.submit(deleteBtn.closest('form') as HTMLFormElement);
    });
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu when a pointer event occurs outside the component', async () => {
    const user = userEvent.setup();
    render(<UserRowActions userId="user-1" email="a@b.com" />);
    await user.click(screen.getByRole('button', { name: /Actions for a@b\.com/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
