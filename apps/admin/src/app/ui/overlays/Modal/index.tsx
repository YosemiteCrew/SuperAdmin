'use client';

import { useEffect, useRef } from 'react';

// Native dialog provides focus trapping and Escape-to-close for free.
export function Modal({
  children,
  isOpen,
}: Readonly<{ children: React.ReactNode; isOpen: boolean }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return <dialog ref={dialogRef}>{children}</dialog>;
}
