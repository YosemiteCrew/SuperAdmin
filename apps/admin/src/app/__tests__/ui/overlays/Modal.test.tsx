import { render } from '@testing-library/react';

import { Modal } from '@/app/ui/overlays/Modal';

describe('Modal', () => {
  it('opens (gets the open attribute) when isOpen is true', () => {
    const { container } = render(<Modal isOpen>hello</Modal>);
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('stays closed when isOpen is false', () => {
    const { container } = render(<Modal isOpen={false}>hidden</Modal>);
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('renders children inside the dialog', () => {
    const { getByText } = render(<Modal isOpen>my-body</Modal>);
    expect(getByText('my-body')).toBeInTheDocument();
  });

  it('closes when isOpen flips from true to false', () => {
    const { container, rerender } = render(<Modal isOpen>x</Modal>);
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    rerender(<Modal isOpen={false}>x</Modal>);
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });
});
