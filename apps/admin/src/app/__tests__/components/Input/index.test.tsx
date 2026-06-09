import { render, screen } from '@testing-library/react';
import { Input } from '@/app/ui/components/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input id="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input id="email" label="Email" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});
