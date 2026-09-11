import { fireEvent, render, screen, within } from '@testing-library/react';

import { UsersTable, type UserRow } from '@/app/(routes)/(dashboard)/users/UsersTable';

const bulkDisableMock = jest.fn((ids: string[]) => Promise.resolve(ids));
const bulkEnableMock = jest.fn((ids: string[]) => Promise.resolve(ids));
const bulkDeleteMock = jest.fn((ids: string[]) => Promise.resolve(ids));
jest.mock('@/app/(routes)/(dashboard)/users/bulkActions', () => ({
  bulkDisableUsersAction: (ids: string[]) => bulkDisableMock(ids),
  bulkEnableUsersAction: (ids: string[]) => bulkEnableMock(ids),
  bulkDeleteUsersAction: (ids: string[]) => bulkDeleteMock(ids),
}));

jest.mock('@/app/(routes)/(dashboard)/users/UserRowActions', () => ({
  UserRowActions: ({ email, canDelete }: Readonly<{ email: string; canDelete: boolean }>) => (
    <div data-testid={`row-actions-${email}`} data-can-delete={canDelete} />
  ),
}));

jest.mock('@/app/(routes)/(dashboard)/users/ConfirmDeleteDialog', () => ({
  ConfirmDeleteDialog: ({
    open,
    count,
    onConfirm,
    onCancel,
  }: Readonly<{
    open: boolean;
    count: number;
    onConfirm: () => void;
    onCancel: () => void;
  }>) =>
    open ? (
      <div data-testid="confirm-delete">
        <span>count {count}</span>
        <button type="button" onClick={onConfirm}>
          confirm delete
        </button>
        <button type="button" onClick={onCancel}>
          cancel delete
        </button>
      </div>
    ) : null,
}));

function row(over: Partial<UserRow> = {}): UserRow {
  return {
    id: 'u-1',
    primaryEmail: 'a@x.com',
    extraEmailCount: 0,
    methods: 'emailpassword',
    tenants: 'public',
    shortId: 'u-1',
    lastSeen: 'Jan 1, 2026',
    lastSeenTitle: 'Last sign-in',
    disabled: false,
    canDelete: true,
    ...over,
  };
}

const ROWS: UserRow[] = [
  row({ id: 'u-1', primaryEmail: 'a@x.com' }),
  row({ id: 'u-2', primaryEmail: 'b@x.com', disabled: true }),
];

const originalConfirm = globalThis.confirm;

beforeEach(() => {
  bulkDisableMock.mockClear();
  bulkEnableMock.mockClear();
  bulkDeleteMock.mockClear();
});
afterEach(() => {
  globalThis.confirm = originalConfirm;
});

describe('UsersTable', () => {
  it('renders a row per user and hides the bulk bar until something is selected', () => {
    render(<UsersTable rows={ROWS} />);
    expect(screen.getByRole('link', { name: 'a@x.com' })).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('shows the bulk bar with a count when a row is selected', () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select a@x\.com/i }));
    expect(screen.getByText('1 user selected')).toBeInTheDocument();
  });

  it('deselects a row when its checkbox is clicked again', () => {
    render(<UsersTable rows={ROWS} />);
    const cb = screen.getByRole('checkbox', { name: /select a@x\.com/i });
    fireEvent.click(cb);
    expect(screen.getByText('1 user selected')).toBeInTheDocument();
    fireEvent.click(cb);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('selects and clears all rows with the header checkbox', () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    expect(screen.getByText('2 users selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('runs the bulk disable action with the selected ids when confirmed', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /disable/i }));
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(bulkDisableMock).toHaveBeenCalledWith(['u-1', 'u-2']);
  });

  it('shows the extra-email count and runs the bulk enable action', () => {
    globalThis.confirm = jest.fn(() => true);
    render(<UsersTable rows={[row({ id: 'u-3', primaryEmail: 'c@x.com', extraEmailCount: 2 })]} />);
    expect(screen.getByText('(+2)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /select c@x\.com/i }));
    const bar = screen.getByText('1 user selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /enable/i }));
    expect(bulkEnableMock).toHaveBeenCalledWith(['u-3']);
  });

  it('does not run a reversible action when its native confirm is dismissed', () => {
    globalThis.confirm = jest.fn(() => false);
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select a@x\.com/i }));
    const bar = screen.getByText('1 user selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /disable/i }));
    expect(bulkDisableMock).not.toHaveBeenCalled();
  });

  it('opens the typed-confirm dialog on bulk delete without deleting immediately', () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    expect(screen.getByTestId('confirm-delete')).toBeInTheDocument();
    expect(screen.getByText('count 2')).toBeInTheDocument();
    expect(bulkDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes the selected ids when the dialog is confirmed', () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm delete' }));
    expect(bulkDeleteMock).toHaveBeenCalledWith(['u-1', 'u-2']);
  });

  it('excludes protected accounts from row and bulk delete controls', () => {
    const rows = [
      row({ id: 'u-1', primaryEmail: 'regular@x.com' }),
      row({ id: 'u-2', primaryEmail: 'self@x.com', canDelete: false }),
      row({ id: 'u-3', primaryEmail: 'bootstrap@x.com', canDelete: false }),
    ];
    render(<UsersTable rows={rows} />);

    expect(screen.getByTestId('row-actions-regular@x.com')).toHaveAttribute(
      'data-can-delete',
      'true'
    );
    expect(screen.getByTestId('row-actions-self@x.com')).toHaveAttribute(
      'data-can-delete',
      'false'
    );
    expect(screen.getByTestId('row-actions-bootstrap@x.com')).toHaveAttribute(
      'data-can-delete',
      'false'
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('3 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    expect(screen.getByText('count 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'confirm delete' }));
    expect(bulkDeleteMock).toHaveBeenCalledWith(['u-1']);
  });

  it('hides bulk delete when every selected account is protected', () => {
    render(
      <UsersTable
        rows={[
          row({ id: 'u-2', primaryEmail: 'self@x.com', canDelete: false }),
          row({ id: 'u-3', primaryEmail: 'bootstrap@x.com', canDelete: false }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    expect(within(bar).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('closes the dialog without deleting when cancelled', () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select a@x\.com/i }));
    const bar = screen.getByText('1 user selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: 'cancel delete' }));
    expect(screen.queryByTestId('confirm-delete')).not.toBeInTheDocument();
    expect(bulkDeleteMock).not.toHaveBeenCalled();
  });
});
