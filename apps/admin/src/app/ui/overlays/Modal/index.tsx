// TODO: implement accessible modal with focus trap
export function Modal({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
