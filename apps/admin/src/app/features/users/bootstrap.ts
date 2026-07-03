import 'server-only';

import SuperTokens from 'supertokens-node';

import { serverEnv } from '@/app/config/env.server';

/**
 * Whether an account is a bootstrap (break-glass) super admin. Such accounts
 * must never be disabled in a bulk sweep: `disabledAt` blocks sign-in before the
 * bootstrap allowlist can re-grant access, locking them out. Fails CLOSED — if
 * we can't confirm, we treat it as protected and skip it.
 */
export async function isBootstrapAdmin(userId: string): Promise<boolean> {
  try {
    const user = await SuperTokens.getUser(userId);
    const email = user?.emails[0]?.toLowerCase();
    return Boolean(email && serverEnv.superadminBootstrapEmails.includes(email));
  } catch {
    return true;
  }
}
