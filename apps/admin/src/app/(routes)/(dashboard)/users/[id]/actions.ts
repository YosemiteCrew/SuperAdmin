'use server';

import { revalidatePath } from 'next/cache';
import SessionNode from 'supertokens-node/recipe/session';

import { ensureSuperTokensInit } from '@/app/config/backend';

export async function revokeSessionAction(formData: FormData) {
  const sessionHandle = formData.get('sessionHandle');
  const userId = formData.get('userId');
  if (typeof sessionHandle !== 'string' || typeof userId !== 'string') return;

  ensureSuperTokensInit();
  await SessionNode.revokeSession(sessionHandle);
  revalidatePath(`/users/${userId}`);
}

export async function revokeAllSessionsAction(formData: FormData) {
  const userId = formData.get('userId');
  if (typeof userId !== 'string') return;

  ensureSuperTokensInit();
  await SessionNode.revokeAllSessionsForUser(userId);
  revalidatePath(`/users/${userId}`);
}
