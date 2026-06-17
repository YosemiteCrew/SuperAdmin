import { render, screen, fireEvent } from '@testing-library/react';

import RouteError from '@/app/error';
import GlobalError from '@/app/global-error';

jest.mock('@/app/lib/reportError', () => ({
  reportError: jest.fn(),
}));

describe('error.tsx (route error boundary)', () => {
  it('renders a friendly title and a Try again button', () => {
    render(<RouteError error={new Error('boom')} reset={jest.fn()} />);
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls reset when Try again is clicked', () => {
    const reset = jest.fn();
    render(<RouteError error={new Error('boom')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
  });

  it('shows raw error message in dev', () => {
    render(<RouteError error={new Error('specific detail')} reset={jest.fn()} />);
    expect(screen.getByText(/specific detail/)).toBeInTheDocument();
  });

  it('reports the error on mount', () => {
    const { reportError } = jest.requireMock('@/app/lib/reportError') as {
      reportError: jest.Mock;
    };
    reportError.mockClear();
    const err = new Error('boom');
    render(<RouteError error={err} reset={jest.fn()} />);
    expect(reportError).toHaveBeenCalledWith(err, expect.objectContaining({ source: 'route' }));
  });
});

describe('global-error.tsx (global error boundary)', () => {
  it('renders title + try again', () => {
    render(<GlobalError error={new Error('global boom')} reset={jest.fn()} />);
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('reports the error on mount', () => {
    const { reportError } = jest.requireMock('@/app/lib/reportError') as {
      reportError: jest.Mock;
    };
    reportError.mockClear();
    const err = new Error('boom');
    render(<GlobalError error={err} reset={jest.fn()} />);
    expect(reportError).toHaveBeenCalledWith(err, expect.objectContaining({ source: 'global' }));
  });

  it('calls reset on Try again', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('boom')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
  });
});
