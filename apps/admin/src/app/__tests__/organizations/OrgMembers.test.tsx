import { render, screen } from '@testing-library/react';

import { OrgMembers } from '@/app/(routes)/(dashboard)/organizations/[id]/OrgMembers';
import type { SuperAdminOrganizationMember } from '@/app/features/organizations/types';

const MEMBERS: SuperAdminOrganizationMember[] = [
  {
    userId: 'user-1',
    roleCode: 'doctor',
    roleDisplay: 'Veterinarian',
    since: '2026-07-01T09:00:00.000Z',
  },
  { userId: 'user-2', roleCode: 'nurse', since: '2026-07-02T09:00:00.000Z' },
];

describe('OrgMembers', () => {
  it('links each member to the account page that can explain a sign-in failure', () => {
    render(<OrgMembers members={MEMBERS} memberCount={2} />);

    expect(screen.getByRole('link', { name: 'user-1' })).toHaveAttribute('href', '/users/user-1');
    expect(screen.getByRole('link', { name: 'user-2' })).toHaveAttribute('href', '/users/user-2');
  });

  it('encodes an id so a slash in it cannot point the link at another route', () => {
    render(
      <OrgMembers
        members={[{ userId: 'a/b', roleCode: 'doctor', since: '2026-07-01T09:00:00.000Z' }]}
        memberCount={1}
      />
    );

    expect(screen.getByRole('link', { name: 'a/b' })).toHaveAttribute('href', '/users/a%2Fb');
  });

  it('falls back to the role code when there is no display name', () => {
    render(<OrgMembers members={MEMBERS} memberCount={2} />);

    expect(screen.getByText('Veterinarian')).toBeInTheDocument();
    expect(screen.getByText('nurse')).toBeInTheDocument();
  });

  it('distinguishes a failed read from an organisation with no members', () => {
    const { rerender } = render(<OrgMembers members={null} memberCount={4} />);
    expect(screen.getByText(/Couldn't load the member list/i)).toBeInTheDocument();
    expect(screen.queryByText(/No active members/i)).not.toBeInTheDocument();

    rerender(<OrgMembers members={[]} memberCount={0} />);
    expect(screen.getByText(/No active members/i)).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load the member list/i)).not.toBeInTheDocument();
  });

  it('flags an empty list that contradicts the count, rather than showing them side by side', () => {
    // memberCount and the list are resolved by one predicate, so a disagreement
    // means something matched for one and not the other - which is exactly the
    // defect this list was added alongside.
    render(<OrgMembers members={[]} memberCount={7} />);

    expect(screen.getByText(/count above disagrees/i)).toBeInTheDocument();
  });

  it('says nothing about the count when an empty list agrees with it', () => {
    render(<OrgMembers members={[]} memberCount={0} />);

    expect(screen.queryByText(/count above disagrees/i)).not.toBeInTheDocument();
  });

  it('renders an unparseable join date as a dash rather than Invalid Date', () => {
    render(
      <OrgMembers
        members={[{ userId: 'user-3', roleCode: 'doctor', since: 'not-a-date' }]}
        memberCount={1}
      />
    );

    expect(screen.getByText('Member since —')).toBeInTheDocument();
  });
});
