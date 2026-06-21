import { render, screen } from '@testing-library/react';

import { AuditTable } from '@/app/features/audit/AuditTable';
import type { AuditEvent } from '@/app/features/audit/types';

const EVENTS: AuditEvent[] = [
  {
    id: 'a',
    action: 'user.delete',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    targetLabel: 'victim@x.com',
    at: 1_700_000_000_000,
  },
  {
    id: 'b',
    action: 'mystery' as AuditEvent['action'],
    actorId: 'admin-2',
    actorEmail: 'boss@x.com',
    targetType: 'organization',
    targetId: 'o-1',
    at: 1_700_000_500_000,
  },
];

describe('AuditTable', () => {
  it('renders the empty state with a custom message', () => {
    render(<AuditTable events={[]} emptyMessage="Nothing logged." />);
    expect(screen.getByText('Nothing logged.')).toBeInTheDocument();
  });

  it('renders the default empty message when none is provided', () => {
    render(<AuditTable events={[]} />);
    expect(screen.getByText(/no activity matches these filters/i)).toBeInTheDocument();
  });

  it('renders a row per event with actor, label, and target', () => {
    render(<AuditTable events={EVENTS} />);
    expect(screen.getByText('admin@x.com')).toBeInTheDocument();
    expect(screen.getByText('Deleted user')).toBeInTheDocument();
    expect(screen.getByText('victim@x.com')).toBeInTheDocument();
    // Unknown action falls back to the raw action string and target id.
    expect(screen.getByText('mystery')).toBeInTheDocument();
    expect(screen.getByText('o-1')).toBeInTheDocument();
  });
});
