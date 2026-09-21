import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ConfirmDeleteDialog } from '@/app/(routes)/(dashboard)/users/ConfirmDeleteDialog';

function setup(over: Partial<Parameters<typeof ConfirmDeleteDialog>[0]> = {}) {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const props = { count: 3, pending: false, onCancel, onConfirm, ...over };
  const { rerender } = render(<ConfirmDeleteDialog open {...props} />);
  return {
    onCancel,
    onConfirm,
    rerenderClosed: () => rerender(<ConfirmDeleteDialog open={false} {...props} />),
  };
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

  it('cancels via the Cancel button', () => {
    const { onCancel } = setup();
    // The hand-rolled backdrop button is gone: the veil is the modal dialog's
    // own ::backdrop now, so "Cancel" is the footer button and nothing else.
    const cancels = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancels).toHaveLength(1);
    fireEvent.click(cancels[0]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels when the click lands on the dialog outside its panel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel when the click lands inside the panel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByLabelText(/type delete to confirm/i));
    expect(onCancel).not.toHaveBeenCalled();
  });

  // Escape reaches this overlay as the dialog's own `cancel` event now that it
  // opens with showModal(). jsdom implements showModal but never fires `cancel`
  // on Escape (probed), so this arm pins the wiring and the real key press is
  // covered by the browser spec in e2e/overlay-focus.spec.ts.
  it('cancels on the dialog cancel event, without letting the browser close it', () => {
    const { onCancel } = setup();
    const dialog = screen.getByRole('dialog');
    const event = new Event('cancel', { bubbles: false, cancelable: true });
    fireEvent(dialog, event);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('opens as a real modal and returns focus to the opener when it closes', async () => {
    const showModal = jest.spyOn(HTMLDialogElement.prototype, 'showModal');
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    const { rerenderClosed } = setup();
    expect(showModal).toHaveBeenCalled();

    // Control: the confirm pulls focus onto its DELETE field. Without proving
    // focus left, the restore assertion below cannot fail.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(/type delete to confirm/i))
    );

    rerenderClosed();
    expect(document.activeElement).toBe(opener);

    showModal.mockRestore();
    opener.remove();
  });

  it('shows a pending label and keeps Delete disabled while deleting', () => {
    setup({ pending: true });
    fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {
      target: { value: 'DELETE' },
    });
    expect(screen.getByRole('button', { name: /Deleting…/ })).toBeDisabled();
  });
});
