import { fireEvent, render, screen } from '@testing-library/react';

import { ConfirmDeleteDialog } from '@/app/(routes)/(dashboard)/users/ConfirmDeleteDialog';

function setup(over: Partial<Parameters<typeof ConfirmDeleteDialog>[0]> = {}) {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  render(
    <ConfirmDeleteDialog
      open
      count={3}
      pending={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...over}
    />
  );
  return { onCancel, onConfirm };
}

describe('ConfirmDeleteDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDeleteDialog
        open={false}
        count={2}
        pending={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the count and disables Delete until DELETE is typed', () => {
    const { onConfirm } = setup({ count: 3 });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete 3 users?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^Delete 3 users$/ });
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {
      target: { value: 'DELETE' },
    });
    expect(confirmBtn).toBeEnabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses the singular noun for a single user', () => {
    setup({ count: 1 });
    expect(screen.getByText('Delete 1 user?')).toBeInTheDocument();
  });

  it('does not enable Delete for the wrong word', () => {
    setup();
    fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {
      target: { value: 'delete' },
    });
    expect(screen.getByRole('button', { name: /^Delete 3 users$/ })).toBeDisabled();
  });

  it('cancels via the Cancel button and the backdrop', () => {
    const { onCancel } = setup();
    // Both the footer button and the backdrop are labelled "Cancel".
    const cancels = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancels).toHaveLength(2);
    cancels.forEach((btn) => fireEvent.click(btn));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('cancels on Escape', () => {
    const { onCancel } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows a pending label and keeps Delete disabled while deleting', () => {
    setup({ pending: true });
    fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {
      target: { value: 'DELETE' },
    });
    expect(screen.getByRole('button', { name: /Deleting…/ })).toBeDisabled();
  });
});
