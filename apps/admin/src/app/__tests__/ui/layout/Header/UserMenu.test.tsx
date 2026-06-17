import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UserMenu } from '@/app/ui/layout/Header/UserMenu';

const signOutMock = jest.fn();
jest.mock('supertokens-auth-react/recipe/emailpassword', () => ({
  signOut: () => signOutMock(),
}));

const SIGN_OUT = 'Sign out';

describe('UserMenu', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
  });

  it('shows the firstName when provided', () => {
    render(<UserMenu email="aman.gupta@gmail.com" firstName="Aman" lastName={null} />);
    expect(screen.getByText('Aman')).toBeInTheDocument();
  });

  it('falls back to the first email chunk when firstName missing', () => {
    render(<UserMenu email="aman.gupta@gmail.com" firstName={null} lastName={null} />);
    expect(screen.getByText('aman')).toBeInTheDocument();
  });

  it('falls back to the local part for emails without separators', () => {
    render(<UserMenu email="admin@yosemitecrew.com" firstName={null} lastName={null} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('opens the dropdown on trigger click and shows email + Sign out', async () => {
    const user = userEvent.setup();
    render(<UserMenu email="admin@yc.com" firstName={null} lastName={null} />);
    await user.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByText('admin@yc.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: SIGN_OUT })).toBeInTheDocument();
  });

  it('closes the dropdown on Escape', async () => {
    const user = userEvent.setup();
    render(<UserMenu email="admin@yc.com" firstName={null} lastName={null} />);
    await user.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls the SuperTokens signOut SDK when Sign out is clicked', async () => {
    const user = userEvent.setup();
    render(<UserMenu email="admin@yc.com" firstName="Admin" lastName={null} />);
    await user.click(screen.getByRole('button', { name: /Admin/ }));
    await user.click(screen.getByRole('menuitem', { name: SIGN_OUT }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not crash when signOut SDK throws (best-effort cleanup)', async () => {
    signOutMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    const user = userEvent.setup();
    render(<UserMenu email="admin@yc.com" firstName="Admin" lastName={null} />);
    await user.click(screen.getByRole('button', { name: /Admin/ }));
    await user.click(screen.getByRole('menuitem', { name: SIGN_OUT }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
    // The render is still in the tree — nothing was thrown to the boundary.
    expect(screen.getByRole('button', { name: /Admin/ })).toBeInTheDocument();
  });

  it('shows the full name in the dropdown when both names are provided', async () => {
    const user = userEvent.setup();
    render(<UserMenu email="admin@yc.com" firstName="Aman" lastName="Gupta" />);
    await user.click(screen.getByRole('button', { name: /Aman/i }));
    expect(screen.getByText('Aman Gupta')).toBeInTheDocument();
  });
});
