import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SuperTokens from 'supertokens-node';
import EmailPasswordNode from 'supertokens-node/recipe/emailpassword';
import EmailVerificationNode from 'supertokens-node/recipe/emailverification';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';
import MultiFactorAuthNode from 'supertokens-node/recipe/multifactorauth';
import TOTPNode from 'supertokens-node/recipe/totp';
import { TypeInput } from 'supertokens-node/types';
import { getSSRSession } from 'supertokens-node/nextjs';

import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';

import { appInfo } from './appInfo';
import { serverEnv } from './env.server';

async function touchLastSignIn(userId: string): Promise<void> {
  try {
    await UserMetadataNode.updateUserMetadata(userId, {
      lastSignInAt: Date.now(),
    });
  } catch {
    /* non-blocking — auth must still succeed if metadata write fails */
  }
}

/** A disabled account carries a numeric `disabledAt` timestamp in its metadata. */
async function isUserDisabled(userId: string): Promise<boolean> {
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return typeof metadata.disabledAt === 'number';
  } catch {
    /* one retry to absorb a transient metadata blip before deciding */
  }
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return typeof metadata.disabledAt === 'number';
  } catch {
    // Fail CLOSED: this gates a security control (disabled accounts). Treating a
    // persistent read error as "enabled" would let an attacker ride out a disable
    // by inducing errors; blocking sign-in is the safe default.
    return true;
  }
}

export const backendConfig = (): TypeInput => {
  return {
    framework: 'custom',
    supertokens: {
      connectionURI: serverEnv.supertokensConnectionUri,
      apiKey: serverEnv.supertokensApiKey,
    },
    appInfo,
    recipeList: [
      EmailPasswordNode.init({
        override: {
          functions: (originalImplementation) => ({
            ...originalImplementation,
            // Block sign-in for disabled accounts. Returning before a session is
            // created (and only after the password check passes) avoids both a
            // lingering session and account enumeration.
            signIn: async (input) => {
              const response = await originalImplementation.signIn(input);
              if (response.status === 'OK' && (await isUserDisabled(response.user.id))) {
                return { status: 'WRONG_CREDENTIALS_ERROR' };
              }
              return response;
            },
          }),
          apis: (originalImplementation) => ({
            ...originalImplementation,
            // Public self-registration is disabled. This is an internal
            // super-admin panel; accounts are provisioned out-of-band. Removing
            // the endpoint also closes the bootstrap-email takeover vector — an
            // outsider can no longer create an account for an unclaimed
            // bootstrap email and self-elevate. See SECURITY-PENTEST.md #0.
            signUpPOST: undefined,
            signInPOST: async (input) => {
              if (!originalImplementation.signInPOST) {
                throw new Error('signInPOST is disabled');
              }
              const response = await originalImplementation.signInPOST(input);
              if (response.status === 'OK') {
                await touchLastSignIn(response.user.id);
              }
              return response;
            },
          }),
        },
      }),
      // OPTIONAL mode: surfaces verification status for admin management without
      // gating sign-in (existing users aren't forced to verify retroactively).
      EmailVerificationNode.init({ mode: 'OPTIONAL' }),
      SessionNode.init(),
      UserMetadataNode.init(),
      UserRolesNode.init(),
      TOTPNode.init(),
      MultiFactorAuthNode.init({
        firstFactors: [MultiFactorAuthNode.FactorIds.EMAILPASSWORD],
        override: {
          functions: (originalImplementation) => ({
            ...originalImplementation,
            getMFARequirementsForAuth: async () => [MultiFactorAuthNode.FactorIds.TOTP],
          }),
        },
      }),
    ],
    isInServerlessEnv: true,
  };
};

let initialized = false;

export function ensureSuperTokensInit() {
  if (!initialized) {
    SuperTokens.init(backendConfig());
    initialized = true;
  }
}

async function grantSuperAdmin(userId: string): Promise<void> {
  await UserRolesNode.createNewRoleOrAddPermissions(SUPERADMIN_ROLE, []);
  await UserRolesNode.addRoleToUser(DEFAULT_TENANT_ID, userId, SUPERADMIN_ROLE);
}

/**
 * Whether a user holds the super-admin role, granting it on a first sign-in that
 * matches the bootstrap allowlist. Exported for callers that must answer with a
 * status code instead of a redirect (API route handlers) — page code should use
 * {@link assertSuperAdmin} or {@link requireSuperAdmin}.
 */
export async function isSuperAdminUser(userId: string): Promise<boolean> {
  const { roles } = await UserRolesNode.getRolesForUser(DEFAULT_TENANT_ID, userId);
  if (roles.includes(SUPERADMIN_ROLE)) {
    return true;
  }

  const user = await SuperTokens.getUser(userId);
  const email = user?.emails[0]?.toLowerCase();
  if (email && serverEnv.superadminBootstrapEmails.includes(email)) {
    // Safe because public sign-up is disabled (see the EmailPassword apis
    // override): an outsider cannot create an account for a bootstrap email, so
    // matching one here implies an out-of-band-provisioned account. Do NOT
    // re-enable self-registration without also gating this on a verified email.
    await grantSuperAdmin(userId);
    return true;
  }

  return false;
}

function isMfaComplete(payload: Record<string, unknown>): boolean {
  const mfa = payload['st-mfa'];
  return typeof mfa === 'object' && mfa !== null && (mfa as { v?: boolean }).v === true;
}

export async function getAuthenticatedSession(
  returnTo?: string
): Promise<{ userId: string; mfaComplete: boolean }> {
  ensureSuperTokensInit();
  const cookieStore = await cookies();
  const cookieArray = cookieStore.getAll().map(({ name, value }) => ({ name, value }));
  const { accessTokenPayload, hasToken, error } = await getSSRSession(cookieArray);
  if (error || !hasToken || !accessTokenPayload || typeof accessTokenPayload.sub !== 'string') {
    redirect(returnTo ? `/auth?returnTo=${encodeURIComponent(returnTo)}` : '/auth');
  }
  return { userId: accessTokenPayload.sub, mfaComplete: isMfaComplete(accessTokenPayload) };
}

export async function assertSuperAdmin(userId: string): Promise<void> {
  ensureSuperTokensInit();
  if (!(await isSuperAdminUser(userId))) {
    redirect('/forbidden');
  }
}

/**
 * Confirms a disabled flag for the per-request authorization gate. Fails OPEN
 * (a metadata read error is treated as "not disabled") so a transient outage
 * can't lock every admin out of every page — unlike the sign-in check, which
 * fails closed. The sign-in block + session revocation remain the primary
 * controls; this only catches a disabled account whose session outlived them.
 */
async function isConfirmedDisabled(userId: string): Promise<boolean> {
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return typeof metadata.disabledAt === 'number';
  } catch {
    return false;
  }
}

/**
 * Whether an account is disabled, for a caller that must FAIL CLOSED.
 *
 * `isConfirmedDisabled` above deliberately fails open: a metadata blip must not
 * lock every admin out of every page. That trade is right for rendering a page
 * and wrong for handing out a role, so this reports "treat as disabled" when the
 * read fails rather than when it succeeds and says no.
 *
 * Returns true when the account is disabled OR when we could not find out.
 */
export async function isDisabledOrUnknown(userId: string): Promise<boolean> {
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    return typeof metadata.disabledAt === 'number';
  } catch {
    return true;
  }
}

export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const { userId, mfaComplete } = await getAuthenticatedSession();
  await assertSuperAdmin(userId);
  if (!mfaComplete) {
    redirect('/auth/mfa/totp');
  }
  if (await isConfirmedDisabled(userId)) {
    try {
      await SessionNode.revokeAllSessionsForUser(userId);
    } catch {
      /* best-effort; the redirect below still denies access */
    }
    redirect('/auth');
  }
  return { userId };
}
