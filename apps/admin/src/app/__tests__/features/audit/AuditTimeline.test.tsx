import { render, screen } from '@testing-library/react';

import { AuditTimeline } from '@/app/features/audit/AuditTimeline';
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
    action: 'org.verify',
    actorId: 'admin-2',
    actorEmail: 'boss@x.com',
    targetType: 'organization',
    targetId: 'o-1',
    targetLabel: 'Acme Vet',
    at: 1_700_000_500_000,
  },
];

describe('AuditTimeline', () => {
  it('renders the empty state when there are no events', () => {
    render(<AuditTimeline events={[]} emptyMessage="Nothing here yet." />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('renders the default empty message when none is provided', () => {
    render(<AuditTimeline events={[]} />);
    expect(screen.getByText(/no recorded activity yet/i)).toBeInTheDocument();
  });

  it('lists the action label and actor for each event', () => {
    render(<AuditTimeline events={EVENTS} />);
    expect(screen.getByText('Deleted user')).toBeInTheDocument();
    expect(screen.getByText('Verified business')).toBeInTheDocument();
    expect(screen.getByText(/by admin@x\.com/)).toBeInTheDocument();
    expect(screen.getByText(/by boss@x\.com/)).toBeInTheDocument();
  });

  it('includes the target in the description when showTarget is set', () => {
    render(<AuditTimeline events={EVENTS} showTarget />);
    expect(screen.getByText('Deleted user victim@x.com')).toBeInTheDocument();
    expect(screen.getByText('Verified business Acme Vet')).toBeInTheDocument();
  });

  it('renders defensively for an unknown action (raw action, default severity)', () => {
    const unknown: AuditEvent = {
      ...EVENTS[0],
      id: 'z',
      action: 'mystery.event' as AuditEvent['action'],
      targetLabel: undefined,
    };
    render(<AuditTimeline events={[unknown]} />);
    expect(screen.getByText('mystery.event')).toBeInTheDocument();
  });
});
