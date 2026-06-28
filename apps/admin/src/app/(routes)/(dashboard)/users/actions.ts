'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import supertokens from 'supertokens-node';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { usersToCsv, type UserCsvRow } from '@/app/features/users/usersCsv';

const EXPORT_TENANT = 'public';
const EXPORT_PAGE_SIZE = 250;
const EXPORT_MAX_PAGES = 200; // safety cap (~50k users)

export async function deleteUserAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  let targetLabel: string | undefined;
  try {
    const target = await supertokens.getUser(userId);
    targetLabel = target?.emails[0];
  } catch {
    /* labelling is best-effort */
  }

  await supertokens.deleteUser(userId);
  await recordAuditEvent({
    action: 'user.delete',
    actorId,
    targetType: 'user',
    targetId: userId,
    targetLabel,
  });
  revalidatePath('/users');
  redirect('/users');
}

/** Paginates through every user and returns the full list as a CSV string. */
export async function exportUsersAction(): Promise<string> {
  await requireSuperAdmin();

  const rows: UserCsvRow[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const { users, nextPaginationToken } = await supertokens.getUsersNewestFirst({
      tenantId: EXPORT_TENANT,
      limit: EXPORT_PAGE_SIZE,
      paginationToken: cursor,
    });
    for (const user of users) {
      rows.push({
        email: user.emails[0] ?? '',
        methods: Array.from(new Set(user.loginMethods.map((m) => m.recipeId))).join('; '),
        tenants: user.tenantIds.join('; ') || EXPORT_TENANT,
        joined: new Date(user.timeJoined).toISOString(),
        userId: user.id,
      });
    }
    cursor = nextPaginationToken;
    pages += 1;
  } while (cursor && pages < EXPORT_MAX_PAGES);

  return usersToCsv(rows);
}
