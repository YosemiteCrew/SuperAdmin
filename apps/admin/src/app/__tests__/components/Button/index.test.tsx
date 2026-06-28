import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/app/ui/components/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies disabled state', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('uses the primary button styling by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('yc-primary-button');
  });

  it('applies the requested variant and size classes', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-600');
    expect(button).toHaveClass('min-h-14');
  });

  it('tracks the pointer to update the glow on a primary button', () => {
    render(<Button>Glow</Button>);
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(button, { clientX: 30, clientY: 40 });
    expect(button.style.getPropertyValue('--yc-button-x')).not.toBe('');
    expect(button.style.getPropertyValue('--yc-button-y')).not.toBe('');
  });

  it('skips the glow for non-primary variants but still forwards pointer handlers', () => {
    const onMouseEnter = jest.fn();
    const onMouseMove = jest.fn();
    render(
      <Button variant="secondary" onMouseEnter={onMouseEnter} onMouseMove={onMouseMove}>
        Secondary
      </Button>
    );
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button, { clientX: 5, clientY: 5 });
    fireEvent.mouseMove(button, { clientX: 6, clientY: 6 });
    expect(button.style.getPropertyValue('--yc-button-x')).toBe('');
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseMove).toHaveBeenCalledTimes(1);
  });
});
