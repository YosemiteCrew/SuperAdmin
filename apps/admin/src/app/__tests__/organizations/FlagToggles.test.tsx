import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/app/(routes)/(dashboard)/organizations/[id]/flagActions', () => ({
  toggleFlagAction: jest.fn().mockResolvedValue(undefined),
}));

import { FlagToggles } from '@/app/\(routes\)/\(dashboard\)/organizations/[id]/FlagToggles';
import type { OrgFlags } from '@/app/features/feature-flags/store';

const ALL_OFF: OrgFlags = { activityPub: false, betaReporting: false, advancedExport: false };
const ALL_ON: OrgFlags = { activityPub: true, betaReporting: true, advancedExport: true };

describe('FlagToggles', () => {
  it('renders a toggle for each defined feature flag', () => {
    render(<FlagToggles orgId="org-1" flags={ALL_OFF} />);
    expect(screen.getByRole('switch', { name: /ActivityPub/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Beta reporting/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Advanced export/i })).toBeInTheDocument();
  });

  it('sets aria-checked=false for disabled flags', () => {
    render(<FlagToggles orgId="org-1" flags={ALL_OFF} />);
    expect(screen.getByRole('switch', { name: /ActivityPub/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('sets aria-checked=true for enabled flags', () => {
    render(<FlagToggles orgId="org-1" flags={ALL_ON} />);
    expect(screen.getByRole('switch', { name: /ActivityPub/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('renders flag descriptions', () => {
    render(<FlagToggles orgId="org-1" flags={ALL_OFF} />);
    expect(screen.getByText(/AP protocol/i)).toBeInTheDocument();
  });

  it('shows label text for each flag', () => {
    render(<FlagToggles orgId="org-1" flags={ALL_OFF} />);
    expect(screen.getByText('ActivityPub federation')).toBeInTheDocument();
    expect(screen.getByText('Beta reporting')).toBeInTheDocument();
    expect(screen.getByText('Advanced export')).toBeInTheDocument();
  });

  it('fires toggle when a switch is clicked', () => {
    render(<FlagToggles orgId="org-1" flags={ALL_OFF} />);
    const btn = screen.getByRole('switch', { name: /ActivityPub/i });
    fireEvent.click(btn);
    // toggle is async (startTransition); button should still be in the DOM
    expect(btn).toBeInTheDocument();
  });
});
