import { Component, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BulkUserResult } from '@/app/(routes)/(dashboard)/users/bulkActions';
import { UsersTable, type UserRow } from '@/app/(routes)/(dashboard)/users/UsersTable';

const ok = (done: number): BulkUserResult => ({ done, skipped: 0, failed: 0 });

const bulkDisableMock = jest.fn((ids: string[]) => Promise.resolve(ok(ids.length)));
const bulkEnableMock = jest.fn((ids: string[]) => Promise.resolve(ok(ids.length)));
const bulkDeleteMock = jest.fn((ids: string[]) => Promise.resolve(ok(ids.length)));
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

/**
 * Stands in for the app-level error boundary. A rejected action that is not
 * caught inside the transition reaches this, which is exactly the defect: in
 * the app it is `error.tsx` and it replaces the whole dashboard shell.
 */
class TestBoundary extends Component<{ children: ReactNode }, { caught: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { caught: false };
  }

  static getDerivedStateFromError() {
    return { caught: true };
  }

  render() {
    return this.state.caught ? <p>BOUNDARY CAUGHT</p> : this.props.children;
  }
}

function renderInBoundary(rows: UserRow[]) {
  return render(
    <TestBoundary>
      <UsersTable rows={rows} />
    </TestBoundary>
  );
}

async function clickAndSettle(element: HTMLElement) {
  await userEvent.click(element);
}

const originalConfirm = globalThis.confirm;

beforeEach(() => {
  bulkDisableMock.mockClear();
  bulkEnableMock.mockClear();
  bulkDeleteMock.mockClear();
});
afterEach(() => {
  globalThis.confirm = originalConfirm;
  jest.restoreAllMocks();
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

  it('runs the bulk disable action with the selected ids when confirmed', async () => {
    globalThis.confirm = jest.fn(() => true);
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    await clickAndSettle(within(bar).getByRole('button', { name: /disable/i }));
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(bulkDisableMock).toHaveBeenCalledWith(['u-1', 'u-2']);
  });

  it('shows the extra-email count and runs the bulk enable action', async () => {
    globalThis.confirm = jest.fn(() => true);
    render(<UsersTable rows={[row({ id: 'u-3', primaryEmail: 'c@x.com', extraEmailCount: 2 })]} />);
    expect(screen.getByText('(+2)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /select c@x\.com/i }));
    const bar = screen.getByText('1 user selected').closest('div') as HTMLElement;
    await clickAndSettle(within(bar).getByRole('button', { name: /enable/i }));
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
    const deleteButton = within(bar).getByRole('button', { name: /delete/i });
    expect(deleteButton).toHaveClass('hover:bg-[var(--danger-bg)]');
    expect(deleteButton).not.toHaveClass('bg-[var(--danger-bg)]');
    fireEvent.click(deleteButton);
    expect(screen.getByTestId('confirm-delete')).toBeInTheDocument();
    expect(screen.getByText('count 2')).toBeInTheDocument();
    expect(bulkDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes the selected ids when the dialog is confirmed', async () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    await clickAndSettle(screen.getByRole('button', { name: 'confirm delete' }));
    expect(bulkDeleteMock).toHaveBeenCalledWith(['u-1', 'u-2']);
  });

  it('freezes the confirm on the selection it was opened with', async () => {
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    expect(screen.getByText('count 2')).toBeInTheDocument();

    // A checkbox reachable behind the overlay used to rewrite the number in an
    // open "Delete N users?" prompt, and the delete then ran on the new set.
    fireEvent.click(screen.getByRole('checkbox', { name: /select a@x\.com/i }));
    expect(screen.getByText('count 2')).toBeInTheDocument();

    await clickAndSettle(screen.getByRole('button', { name: 'confirm delete' }));
    expect(bulkDeleteMock).toHaveBeenCalledWith(['u-1', 'u-2']);
  });

  it('excludes protected accounts from row and bulk delete controls', async () => {
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
    await clickAndSettle(screen.getByRole('button', { name: 'confirm delete' }));
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

  it('reports what a sweep did, naming skipped and failed only when non-zero', async () => {
    globalThis.confirm = jest.fn(() => true);
    bulkDisableMock.mockResolvedValueOnce({ done: 2, skipped: 1, failed: 0 });
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    await clickAndSettle(within(bar).getByRole('button', { name: /disable/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('2 disabled, 1 skipped');
    expect(screen.getByRole('status')).not.toHaveTextContent('failed');
    // The sweep landed, so the selection is spent.
    await waitFor(() => expect(screen.queryByText(/selected/)).not.toBeInTheDocument());
  });

  it('counts failed accounts in the status line', async () => {
    globalThis.confirm = jest.fn(() => true);
    bulkEnableMock.mockResolvedValueOnce({ done: 1, skipped: 0, failed: 2 });
    render(<UsersTable rows={ROWS} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    await clickAndSettle(within(bar).getByRole('button', { name: /enable/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('1 re-enabled, 2 failed');
  });

  it('keeps a rejected sweep inside the table and holds the selection', async () => {
    globalThis.confirm = jest.fn(() => true);
    bulkDisableMock.mockRejectedValueOnce(new Error('core unreachable'));
    renderInBoundary(ROWS);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    await clickAndSettle(within(bar).getByRole('button', { name: /disable/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The disable could not be completed. The selection was kept so you can try again.'
    );
    expect(screen.queryByText('BOUNDARY CAUGHT')).not.toBeInTheDocument();
    expect(screen.getByText('2 users selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /select a@x\.com/i })).toBeChecked();
  });

  it('keeps a rejected bulk delete inside the table and closes its dialog', async () => {
    bulkDeleteMock.mockRejectedValueOnce(new Error('core unreachable'));
    renderInBoundary(ROWS);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    fireEvent.click(within(bar).getByRole('button', { name: /delete/i }));
    await clickAndSettle(screen.getByRole('button', { name: 'confirm delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The delete could not be completed. The selection was kept so you can try again.'
    );
    expect(screen.queryByText('BOUNDARY CAUGHT')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confirm-delete')).not.toBeInTheDocument();
    expect(screen.getByText('2 users selected')).toBeInTheDocument();
  });

  it('replaces a failure alert with the status line on the next successful sweep', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    globalThis.confirm = jest.fn(() => true);
    bulkDisableMock.mockRejectedValueOnce(new Error('core unreachable'));
    renderInBoundary(ROWS);
    fireEvent.click(screen.getByRole('checkbox', { name: /select all users/i }));
    const bar = screen.getByText('2 users selected').closest('div') as HTMLElement;
    await clickAndSettle(within(bar).getByRole('button', { name: /disable/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await clickAndSettle(within(bar).getByRole('button', { name: /disable/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('2 disabled');
    expect(consoleError).not.toHaveBeenCalled();
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
