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

  // Without w-full the element falls back to the UA default width (~155px at
  // the panel's font size) and ignores its container, which is what left the
  // settings fields fixed-width and clipped their placeholder.
  it('fills its container rather than the UA default width', () => {
    render(<Input id="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toHaveClass('w-full');
  });

  it('is visible against the page background', () => {
    render(<Input id="email" label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveClass('border-[color:var(--hairline)]');
    expect(input).toHaveClass('bg-[var(--field-bg)]');
  });

  it('keeps a caller className alongside the field styling', () => {
    render(<Input id="email" label="Email" className="mt-4" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveClass('mt-4');
    expect(input).toHaveClass('w-full');
  });
});
