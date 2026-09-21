jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('@/app/features/organizations/notes', () => ({
  MAX_NOTE_CHARS: 2_000,
  addOrgNote: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { addOrgNote } from '@/app/features/organizations/notes';
import { addNoteAction } from '@/app/(routes)/(dashboard)/organizations/[id]/noteActions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockAddNote = addOrgNote as jest.MockedFunction<typeof addOrgNote>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;
const mockRevalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

it('does not read, add, audit, or revalidate when the caller is not a super admin', async () => {
  mockRequireSuperAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
  const formData = new FormData();
  formData.set('orgId', 'org-1');
  formData.set('content', 'Call the clinic back tomorrow');

  await expect(addNoteAction(formData)).rejects.toThrow('NEXT_REDIRECT');

  expect(mockGetUser).not.toHaveBeenCalled();
  expect(mockAddNote).not.toHaveBeenCalled();
  expect(mockAudit).not.toHaveBeenCalled();
  expect(mockRevalidate).not.toHaveBeenCalled();
});
