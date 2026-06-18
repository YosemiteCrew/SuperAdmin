'use server';

import { redirect } from 'next/navigation';
import SessionNode from 'supertokens-node/recipe/session';

import { requireSuperAdmin } from '@/app/config/backend';

export async function signOutEverywhereAction() {
  const { userId } = await requireSuperAdmin();
  await SessionNode.revokeAllSessionsForUser(userId);
  redirect('/auth');
}
