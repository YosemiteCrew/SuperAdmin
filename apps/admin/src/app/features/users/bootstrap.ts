import 'server-only';

import SuperTokens from 'supertokens-node';
import type { User } from 'supertokens-node/types';

import { serverEnv } from '@/app/config/env.server';

export function isBootstrapAdminEmail(email: string | undefined): boolean {
  return Boolean(email && serverEnv.superadminBootstrapEmails.includes(email.toLowerCase()));
}

/**
 * Whether the account's first email is on the bootstrap allowlist and has been
 * confirmed on the sign-in method that carries it.
 */
export function hasVerifiedBootstrapEmail(
  user: Pick<User, 'emails' | 'loginMethods'> | undefined
): boolean {
  const email = user?.emails[0]?.toLowerCase();
  if (!isBootstrapAdminEmail(email)) return false;
  return user?.loginMethods.find((m) => m.email?.toLowerCase() === email)?.verified === true;
}

export function canOfferUserDeletion(
  user: Pick<User, 'id' | 'emails' | 'loginMethods'>,
  actorId: string
): boolean {
  return user.id !== actorId && !hasVerifiedBootstrapEmail(user);
}

/**
 * Whether an account is a bootstrap (break-glass) super admin. Such accounts
 * must never be disabled in a bulk sweep: `disabledAt` blocks sign-in before the
 * bootstrap allowlist can re-grant access, locking them out. Fails CLOSED — if
 * we can't confirm, we treat it as protected and skip it.
 */
export async function isBootstrapAdmin(userId: string): Promise<boolean> {
  try {
    return hasVerifiedBootstrapEmail(await SuperTokens.getUser(userId));
  } catch {
    return true;
  }
}

/**
 * Whether an account is confirmed to be a bootstrap admin. Use this only when
 * `true` grants permission to rely on that account as a safety anchor: a lookup
 * failure cannot prove the account is protected.
 */
export async function isConfirmedBootstrapAdmin(userId: string): Promise<boolean> {
  try {
    return hasVerifiedBootstrapEmail(await SuperTokens.getUser(userId));
  } catch {
    return false;
  }
}
