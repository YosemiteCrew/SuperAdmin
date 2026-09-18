import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockAddNote = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/organizations/[id]/noteActions', () => ({
  addNoteAction: (...args: unknown[]) => mockAddNote(...args),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddNote.mockResolvedValue({});
  });

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

  it('keeps a note available for retry when saving fails', async () => {
    mockAddNote.mockResolvedValue({ error: 'Could not save note' });
    render(<OrgNotes orgId="org-1" notes={[]} />);
    const textarea = screen.getByPlaceholderText(/Add an internal note/i);

    fireEvent.change(textarea, { target: { value: 'Call the clinic back tomorrow' } });
    fireEvent.click(screen.getByRole('button', { name: /Add note/i }));

    const error = await screen.findByText('Could not save note');
    expect(textarea).toHaveValue('Call the clinic back tomorrow');
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('clears a note after saving succeeds', async () => {
    render(<OrgNotes orgId="org-1" notes={[]} />);
    const textarea = screen.getByPlaceholderText(/Add an internal note/i);

    fireEvent.change(textarea, { target: { value: 'Saved note' } });
    fireEvent.click(screen.getByRole('button', { name: /Add note/i }));

    await waitFor(() => expect(mockAddNote).toHaveBeenCalled());
    await waitFor(() => expect(textarea).toHaveValue(''));
  });
});
