import { render, screen } from '@testing-library/react';

import { StatsCard } from '@/app/ui/cards/StatsCard';

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Total users" value={42} />);
    expect(screen.getByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(<StatsCard title="Growth" value="+12%" trend="+3% MoM" />);
    expect(screen.getByText('+3% MoM')).toBeInTheDocument();
  });

  it('omits trend element when not provided', () => {
    render(<StatsCard title="Plain" value="1" />);
    expect(screen.queryByText(/MoM/)).not.toBeInTheDocument();
  });

  it('coerces numeric value to text', () => {
    render(<StatsCard title="Count" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
