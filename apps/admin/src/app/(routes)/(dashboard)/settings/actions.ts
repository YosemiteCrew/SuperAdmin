'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SuperTokens from 'supertokens-node';
import EmailPasswordNode from 'supertokens-node/recipe/emailpassword';
import SessionNode from 'supertokens-node/recipe/session';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { isValidEmail } from '@/app/features/settings/email';

const SESSION_COOKIE_NAMES = [
  'sAccessToken',
  'sRefreshToken',
  'sFrontToken',
  'sAntiCsrf',
  'st-last-access-token-update',
];

export async function signOutEverywhereAction() {
  const { userId } = await requireSuperAdmin();
  await SessionNode.revokeAllSessionsForUser(userId);
  // Clear the local cookies too: otherwise the still-present sAccessToken makes
  // middleware treat the follow-up /auth request as authenticated and bounce it
  // back to /dashboard, where the revoked session is rejected — a redirect loop.
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    cookieStore.delete(name);
  }
  redirect('/auth');
}

export interface ChangeEmailResult {
  ok: boolean;
  message: string;
}

/**
 * Changes the signed-in admin's OWN sign-in email. The target is always the
 * caller's own session user — never an id from input — so it cannot be used to
 * change anyone else's email. The new address is left unverified by SuperTokens.
 */
export async function changeEmailAction(rawEmail: string): Promise<ChangeEmailResult> {
  const { userId } = await requireSuperAdmin();

  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  const user = await SuperTokens.getUser(userId);
  const method = user?.loginMethods.find((m) => m.recipeId === 'emailpassword');
  if (!method) {
    return { ok: false, message: 'This account has no email/password login to update.' };
  }
  if (method.email?.toLowerCase() === email) {
    return { ok: false, message: 'That is already your email address.' };
  }

  const result = await EmailPasswordNode.updateEmailOrPassword({
    recipeUserId: method.recipeUserId,
    email,
  });

  if (result.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
    return { ok: false, message: 'That email is already in use by another account.' };
  }
  if (result.status === 'EMAIL_CHANGE_NOT_ALLOWED_ERROR') {
    return { ok: false, message: 'Email change is not allowed for this account.' };
  }
  if (result.status !== 'OK') {
    return { ok: false, message: 'Could not update your email. Please try again.' };
  }

  await recordAuditEvent({
    action: 'user.email_change',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    targetLabel: email,
  });
  revalidatePath('/settings');
  return { ok: true, message: 'Email updated. Please verify your new address.' };
}
