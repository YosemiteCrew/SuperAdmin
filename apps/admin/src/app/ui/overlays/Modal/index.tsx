'use client';

import { useEffect, useRef } from 'react';

/**
 * The panel's one modal overlay.
 *
 * `showModal()` is what makes it modal: the platform puts the dialog in the top
 * layer, marks everything behind it inert, contains Tab and Shift+Tab, and
 * fires `cancel` on Escape. A `<dialog open>` gets none of that — the page
 * behind stays focusable and reachable, which is the defect in #552.
 *
 * Focus restore is NOT free. The browser moves focus into the dialog on open
 * and leaves it on `<body>` afterwards, so the opener is remembered here and
 * focused again when the overlay closes or unmounts.
 */
export function Modal({
  children,
  isOpen,
  onClose,
  className,
  label,
  labelledBy,
}: Readonly<{
  children: React.ReactNode;
  isOpen: boolean;
  /** Escape, a click on the backdrop, or the dialog's own cancel event. */
  onClose?: () => void;
  className?: string;
  label?: string;
  labelledBy?: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    // Read the opener before showModal() moves focus off it.
    const opener = document.activeElement;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
      // A consumer that unmounts on close (the command palette does) never
      // reaches a second effect run, so the restore lives in the cleanup.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [isOpen]);

  // A modal dialog fills the viewport for hit-testing, so a click that lands on
  // the dialog element itself is a click outside its content. Registered here
  // rather than as a JSX `onClick`, which puts a mouse-only handler on a
  // non-interactive element (sonar S1082/S6847); Escape is the keyboard route
  // out and the platform supplies it. Its own effect so that a fresh `onClose`
  // closure re-binds the listener without closing and reopening the dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const onBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose?.();
    };
    dialog.addEventListener('click', onBackdropClick);
    return () => dialog.removeEventListener('click', onBackdropClick);
  }, [isOpen, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={className}
      onCancel={(event) => {
        // Let React state decide the overlay is closed; the browser's own
        // close would leave `isOpen` true and the dialog would not reopen.
        event.preventDefault();
        onClose?.();
      }}
    >
      {children}
    </dialog>
  );
}
