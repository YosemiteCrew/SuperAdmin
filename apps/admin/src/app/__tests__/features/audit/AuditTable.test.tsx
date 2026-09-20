import { render, screen } from '@testing-library/react';

import { AuditTable } from '@/app/features/audit/AuditTable';
import { AUDIT_TARGET_TYPE_LABELS, AUDIT_TARGET_TYPES } from '@/app/features/audit/types';
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

function event(over: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'e',
    action: 'user.session_revoke',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    targetLabel: 'someone@x.com',
    at: 1_700_000_000_000,
    ...over,
  };
}

describe('AuditTable severity', () => {
  /**
   * Severity used to live in the dot alone, and the dot is aria-hidden. These
   * three assert the word is in the accessibility tree; the badge assertions
   * below assert it is also visible without colour. Both halves are needed —
   * a screen reader and a greyscale display fail in different ways.
   */
  it.each([
    ['user.session_revoke', 'Info'],
    ['role.grant', 'Warning'],
    ['user.delete', 'High risk'],
  ] as const)('exposes %s as "%s" in the row text', (action, word) => {
    render(<AuditTable events={[event({ action: action as AuditEvent['action'] })]} />);
    expect(screen.getByRole('row', { name: new RegExp(word) })).toBeInTheDocument();
  });

  it('shows a visible badge for warning and danger and none for info', () => {
    render(
      <AuditTable
        events={[
          event({ id: 'i', action: 'user.session_revoke' }),
          event({ id: 'w', action: 'role.grant' }),
          event({ id: 'd', action: 'user.delete' }),
        ]}
      />
    );
    // The badge is aria-hidden (the sr-only word already announces severity),
    // so it is found by its own text rather than by role.
    expect(screen.getByText('Warning', { selector: 'span[aria-hidden]' })).toBeInTheDocument();
    expect(screen.getByText('High risk', { selector: 'span[aria-hidden]' })).toBeInTheDocument();
    expect(screen.queryByText('Info', { selector: 'span[aria-hidden]' })).not.toBeInTheDocument();
  });
});

describe('AuditTable identifiers', () => {
  it('renders every target kind in words, never as its raw id', () => {
    render(
      <AuditTable
        events={AUDIT_TARGET_TYPES.map((targetType, i) =>
          event({ id: `t${i}`, targetType, targetLabel: 'a label' })
        )}
      />
    );
    for (const targetType of AUDIT_TARGET_TYPES) {
      expect(screen.getByText(AUDIT_TARGET_TYPE_LABELS[targetType])).toBeInTheDocument();
      if (targetType.includes('_')) {
        expect(screen.queryByText(targetType)).not.toBeInTheDocument();
      }
    }
  });

  it('puts a recorded status enum into words in the Target column', () => {
    render(
      <AuditTable
        events={[
          event({
            action: 'contact.status_change',
            targetType: 'contact_request',
            targetLabel: 'in_progress',
          }),
        ]}
      />
    );
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.queryByText('in_progress')).not.toBeInTheDocument();
  });

  it('leaves no snake_case identifier anywhere in the rendered table', () => {
    const { container } = render(
      <AuditTable
        events={[
          event({
            action: 'privacy.request_update',
            targetType: 'data_request',
            targetLabel: 'in_progress',
          }),
          event({ id: 'b', action: 'ap_token.revoke', targetType: 'ap_token' }),
          event({ id: 'c', action: 'social.connect', targetType: 'social_account' }),
        ]}
      />
    );
    expect(container.textContent ?? '').not.toMatch(/\b[a-z]+_[a-z_]+\b/);
  });
});
