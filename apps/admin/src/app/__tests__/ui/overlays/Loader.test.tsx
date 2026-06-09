import { render, screen } from '@testing-library/react';
import { Loader } from '@/app/ui/overlays/Loader';

describe('Loader', () => {
  it('renders with default label', () => {
    render(<Loader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<Loader label="Fetching data..." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data...');
  });
});
