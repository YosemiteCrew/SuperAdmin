import { render, screen } from '@testing-library/react';
import { SkipLink } from '@/app/ui/layout/SkipLink';

describe('SkipLink', () => {
  it('renders with correct href', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#main-content'
    );
  });
});
