import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/app/(routes)/(dashboard)/organizations/[id]/noteActions', () => ({
  addNoteAction: jest.fn().mockResolvedValue({}),
}));

import { OrgNotes } from '@/app/\(routes\)/\(dashboard\)/organizations/[id]/OrgNotes';
import type { OrgNote } from '@/app/features/organizations/notes';

function makeNote(overrides: Partial<OrgNote> = {}): OrgNote {
  return {
    id: 'n1',
    actorId: 'u1',
    actorEmail: 'admin@yc.com',
    content: 'Test note content',
    at: new Date('2024-06-01T10:00:00Z').getTime(),
    ...overrides,
  };
}

describe('OrgNotes', () => {
  it('shows empty state when no notes', () => {
    render(<OrgNotes orgId="org-1" notes={[]} />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('renders a textarea for adding a note', () => {
    render(<OrgNotes orgId="org-1" notes={[]} />);
    expect(screen.getByPlaceholderText(/Add an internal note/i)).toBeInTheDocument();
  });

  it('renders existing notes', () => {
    render(<OrgNotes orgId="org-1" notes={[makeNote()]} />);
    expect(screen.getByText('Test note content')).toBeInTheDocument();
  });

  it('shows the actor email for each note', () => {
    render(<OrgNotes orgId="org-1" notes={[makeNote()]} />);
    expect(screen.getByText('admin@yc.com')).toBeInTheDocument();
  });

  it('renders multiple notes in order', () => {
    const notes = [
      makeNote({ id: 'n1', content: 'First' }),
      makeNote({ id: 'n2', content: 'Second' }),
    ];
    render(<OrgNotes orgId="org-1" notes={notes} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('renders the Add note submit button', () => {
    render(<OrgNotes orgId="org-1" notes={[]} />);
    expect(screen.getByRole('button', { name: /Add note/i })).toBeInTheDocument();
  });
});
