import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { APLicenseToken } from '@superadmin/database';

jest.mock('@superadmin/database', () => ({
  prisma: {},
}));

jest.mock('@/app/(routes)/(dashboard)/ap/actions', () => ({
  issueLicenseTokenAction: jest.fn(),
  revokeLicenseTokenAction: jest.fn(),
}));

import { InstancesTable } from '@/app/(routes)/(dashboard)/ap/InstancesTable';
import {
  issueLicenseTokenAction,
  revokeLicenseTokenAction,
} from '@/app/(routes)/(dashboard)/ap/actions';

const mockIssue = issueLicenseTokenAction as jest.MockedFunction<typeof issueLicenseTokenAction>;
const mockRevoke = revokeLicenseTokenAction as jest.MockedFunction<typeof revokeLicenseTokenAction>;

const now = new Date();
const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
const past = new Date(now.getTime() - 1000);

function makeToken(overrides: Partial<APLicenseToken> = {}): APLicenseToken {
  return {
    id: 'tok_1',
    orgId: 'org_abc',
    instanceDomain: 'pims.example.com',
    token: 'jwt.token.here',
    keyId: 'yc-ap-2026-01',
    tier: 'pro',
    issuedAt: now,
    expiresAt: future90,
    revokedAt: null,
    revokedBy: null,
    ...overrides,
  };
}

describe('InstancesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty state when no tokens', () => {
    render(<InstancesTable tokens={[]} />);
    expect(screen.getByText(/No AP license tokens issued yet/)).toBeInTheDocument();
  });

  it('renders token domain and org ID', () => {
    render(<InstancesTable tokens={[makeToken()]} />);
    expect(screen.getByText('pims.example.com')).toBeInTheDocument();
    expect(screen.getByText('org_abc')).toBeInTheDocument();
  });

  it('shows Active badge for a non-revoked, non-expired token', () => {
    render(<InstancesTable tokens={[makeToken()]} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Revoked badge when revokedAt is set', () => {
    render(<InstancesTable tokens={[makeToken({ revokedAt: past })]} />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('shows Expired badge when expiresAt is in the past', () => {
    render(<InstancesTable tokens={[makeToken({ expiresAt: past })]} />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows Revoke button only for active tokens', () => {
    const tokens = [
      makeToken({ id: 'tok_active' }),
      makeToken({ id: 'tok_revoked', revokedAt: past }),
      makeToken({ id: 'tok_expired', expiresAt: past }),
    ];
    render(<InstancesTable tokens={tokens} />);
    const revokeButtons = screen
      .getAllByRole('button', { name: /Revoke/i })
      .filter((btn) => btn.textContent === 'Revoke');
    expect(revokeButtons).toHaveLength(1);
  });

  it('shows a retryable error when token revocation fails', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockRevoke.mockRejectedValue(new Error('database unavailable'));
    render(<InstancesTable tokens={[makeToken()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Token could not be revoked');
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeEnabled();

    mockRevoke.mockResolvedValue();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(mockRevoke).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockRevoke.mock.calls[0][0].get('tokenId')).toBe('tok_1');
  });

  it('does not revoke a token when confirmation is dismissed', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<InstancesTable tokens={[makeToken()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('renders tier badge', () => {
    render(<InstancesTable tokens={[makeToken({ tier: 'enterprise' })]} />);
    expect(screen.getByText('enterprise')).toBeInTheDocument();
  });

  // `tier` is an unconstrained string column, so a tier with no styling entry is
  // reachable. Without the fallback the class list picks up a literal
  // "undefined"; this pins the guard down as live rather than dead code.
  it('falls back to the free-tier styling for a tier it does not know', () => {
    render(<InstancesTable tokens={[makeToken({ tier: 'trial' })]} />);
    const badge = screen.getByText('trial');
    expect(badge).toBeInTheDocument();
    expect(badge.className).not.toContain('undefined');
    expect(badge.className).toContain('var(--inset)');
  });

  it('renders multiple tokens', () => {
    const tokens = [
      makeToken({ id: 'tok_1', instanceDomain: 'a.example.com' }),
      makeToken({ id: 'tok_2', instanceDomain: 'b.example.com' }),
    ];
    render(<InstancesTable tokens={tokens} />);
    expect(screen.getByText('a.example.com')).toBeInTheDocument();
    expect(screen.getByText('b.example.com')).toBeInTheDocument();
  });

  it('renders Issue form with org ID, domain, and tier fields', () => {
    render(<InstancesTable tokens={[]} />);
    expect(screen.getByLabelText(/Org ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instance domain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tier/i)).toBeInTheDocument();
  });

  it('shows Issue token submit button', () => {
    render(<InstancesTable tokens={[]} />);
    expect(screen.getByRole('button', { name: /Issue token/i })).toBeInTheDocument();
  });

  it('tier select has free, pro, enterprise options', () => {
    render(<InstancesTable tokens={[]} />);
    const select = screen.getByLabelText(/Tier/i) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('free');
    expect(values).toContain('pro');
    expect(values).toContain('enterprise');
  });

  it('keeps license details available for retry when issuance fails', async () => {
    mockIssue.mockResolvedValue({ ok: false, error: 'AP signing key is not configured' });
    render(<InstancesTable tokens={[]} />);

    fireEvent.change(screen.getByLabelText(/Org ID/i), { target: { value: 'org_retry' } });
    fireEvent.change(screen.getByLabelText(/Instance domain/i), {
      target: { value: 'retry.example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Tier/i), { target: { value: 'enterprise' } });
    fireEvent.click(screen.getByRole('button', { name: /Issue token/i }));

    const error = await screen.findByText('AP signing key is not configured');
    expect(screen.getByLabelText(/Org ID/i)).toHaveValue('org_retry');
    expect(screen.getByLabelText(/Instance domain/i)).toHaveValue('retry.example.com');
    expect(screen.getByLabelText(/Tier/i)).toHaveValue('enterprise');
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('clears license details after issuance succeeds', async () => {
    mockIssue.mockResolvedValue({ ok: true, token: 'issued.token' });
    render(<InstancesTable tokens={[]} />);

    fireEvent.change(screen.getByLabelText(/Org ID/i), { target: { value: 'org_done' } });
    fireEvent.change(screen.getByLabelText(/Instance domain/i), {
      target: { value: 'done.example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Tier/i), { target: { value: 'pro' } });
    fireEvent.click(screen.getByRole('button', { name: /Issue token/i }));

    await waitFor(() => expect(mockIssue).toHaveBeenCalled());
    expect(await screen.findByText(/Token issued/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Org ID/i)).toHaveValue('');
    expect(screen.getByLabelText(/Instance domain/i)).toHaveValue('');
    expect(screen.getByLabelText(/Tier/i)).toHaveValue('free');
  });
});
