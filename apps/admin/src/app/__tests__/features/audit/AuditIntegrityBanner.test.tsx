import { render, screen } from '@testing-library/react';

import { AuditIntegrityBanner } from '@/app/features/audit/AuditIntegrityBanner';
import type { AuditChainStatus } from '@/app/features/audit/types';

function renderBanner(status: AuditChainStatus) {
  return render(<AuditIntegrityBanner status={status} />);
}

describe('AuditIntegrityBanner', () => {
  it('renders nothing when there are no events to verify', () => {
    const { container } = renderBanner({ ok: true, length: 0, total: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an unavailable status when the log could not be read', () => {
    renderBanner({ ok: false, length: 0, total: 0, reason: 'read-failed' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Integrity check unavailable')).toBeInTheDocument();
  });

  it('alerts when an entry was modified, naming the broken entry', () => {
    renderBanner({
      ok: false,
      length: 1,
      total: 3,
      brokenAtId: 'evt-9',
      reason: 'content-altered',
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Audit log integrity check failed');
    expect(alert).toHaveTextContent('at entry evt-9');
    expect(alert).toHaveTextContent('modified after it was recorded');
  });

  it('alerts when an entry is missing or out of order', () => {
    renderBanner({ ok: false, length: 0, total: 2, reason: 'link-broken' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('missing or out of order');
    expect(alert).not.toHaveTextContent('at entry');
  });

  it('alerts when the newest entry carries no chain link', () => {
    renderBanner({
      ok: false,
      length: 0,
      total: 3,
      brokenAtId: 'evt-1',
      reason: 'head-unchained',
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('at entry evt-1');
    expect(alert).toHaveTextContent('newest entry carries no chain link');
  });

  it('alerts when a stored entry is not a well-formed record', () => {
    renderBanner({
      ok: false,
      length: 0,
      total: 3,
      brokenAtId: 'evt-2',
      reason: 'invalid-record',
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Audit log integrity check failed');
    expect(alert).toHaveTextContent('entry evt-2');
    expect(alert).toHaveTextContent('not a well-formed audit record');
  });

  it('alerts on an invalid record with no id', () => {
    renderBanner({ ok: false, length: 0, total: 1, reason: 'invalid-record' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('not a well-formed audit record');
    expect(alert).not.toHaveTextContent('(entry');
  });

  it('reports a fully verified log (plural)', () => {
    renderBanner({ ok: true, length: 4, total: 4 });
    expect(screen.getByText('Audit log integrity verified')).toBeInTheDocument();
    expect(screen.getByText(/All 4 entries form an intact hash chain/)).toBeInTheDocument();
  });

  it('reports a fully verified log (singular)', () => {
    renderBanner({ ok: true, length: 1, total: 1 });
    expect(screen.getByText(/All 1 entry forms an intact hash chain/)).toBeInTheDocument();
  });

  it('reports partial verification with multiple legacy entries', () => {
    renderBanner({ ok: true, length: 3, total: 5 });
    expect(screen.getByText(/3 of 5 entries verified/)).toBeInTheDocument();
    expect(screen.getByText(/2 older entries predate tamper-evidence/)).toBeInTheDocument();
  });

  it('reports partial verification with a single legacy entry', () => {
    renderBanner({ ok: true, length: 4, total: 5 });
    expect(screen.getByText(/1 older entry predates tamper-evidence/)).toBeInTheDocument();
  });
});
