import { render, screen } from '@testing-library/react';
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
});
