'use server';

import { revalidatePath } from 'next/cache';
import SessionNode from 'supertokens-node/recipe/session';

import { requireSuperAdmin } from '@/app/config/backend';

export async function revokeSessionAction(formData: FormData) {
  await requireSuperAdmin();

  const sessionHandle = formData.get('sessionHandle');
  const userId = formData.get('userId');
  if (typeof sessionHandle !== 'string' || typeof userId !== 'string') return;

  await SessionNode.revokeSession(sessionHandle);
  revalidatePath(`/users/${userId}`);
}

export async function revokeAllSessionsAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string') return;

  await SessionNode.revokeAllSessionsForUser(userId);
  revalidatePath(`/users/${userId}`);
}
