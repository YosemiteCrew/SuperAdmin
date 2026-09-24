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
import OpenIdNode from 'supertokens-node/recipe/openid';
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
            // super-admin panel; accounts are provisioned out-of-band.
            signUpPOST: undefined,
            // Serves both the current and the legacy email-exists route.
            emailExistsGET: undefined,
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
 * Whether a user holds the super-admin role, granting it on a first sign-in by an
 * account with a confirmed email on the bootstrap allowlist. Exported for callers
 * that must answer with a status code instead of a redirect (API route handlers) —
 * page code should use {@link assertSuperAdmin} or {@link requireSuperAdmin}.
 */
export async function isSuperAdminUser(userId: string): Promise<boolean> {
  const { roles } = await UserRolesNode.getRolesForUser(DEFAULT_TENANT_ID, userId);
  if (roles.includes(SUPERADMIN_ROLE)) {
    return true;
  }

  const user = await SuperTokens.getUser(userId);
  const email = user?.emails[0]?.toLowerCase();
  if (email && serverEnv.superadminBootstrapEmails.includes(email)) {
    // The allowlist only counts for an account that has confirmed the address.
    const method = user?.loginMethods.find((m) => m.email?.toLowerCase() === email);
    if (
      method &&
      (await EmailVerificationNode.isEmailVerified(method.recipeUserId, method.email))
    ) {
      await grantSuperAdmin(userId);
      return true;
    }
  }

  return false;
}

/** Whether the session was started on this panel. */
export async function isPanelSession(payload: Record<string, unknown>): Promise<boolean> {
  const { issuer } = await OpenIdNode.getOpenIdDiscoveryConfiguration();
  return payload.iss === issuer;
}

function isMfaComplete(payload: Record<string, unknown>): boolean {
  const mfa = payload['st-mfa'];
  return typeof mfa === 'object' && mfa !== null && (mfa as { v?: boolean }).v === true;
}

function inviteReturnTo(value?: string): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value, 'https://internal.invalid');
    const token = parsed.searchParams.get('token');
    if (
      parsed.origin !== 'https://internal.invalid' ||
      parsed.pathname !== '/accept-invite' ||
      !token
    ) {
      return null;
    }
    return `/accept-invite?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

export async function getAuthenticatedSession(
  returnTo?: string
): Promise<{ userId: string; mfaComplete: boolean }> {
  ensureSuperTokensInit();
  const cookieStore = await cookies();
  const cookieArray = cookieStore.getAll().map(({ name, value }) => ({ name, value }));
  const { accessTokenPayload, hasToken, error } = await getSSRSession(cookieArray);
  if (
    error ||
    !hasToken ||
    !accessTokenPayload ||
    typeof accessTokenPayload.sub !== 'string' ||
    !(await isPanelSession(accessTokenPayload))
  ) {
    const safeReturnTo = inviteReturnTo(returnTo);
    if (!safeReturnTo) redirect('/auth');
    const query = new URLSearchParams({ returnTo: safeReturnTo });
    redirect(`/auth?${query.toString()}`);
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

export async function requireSuperAdmin(
  access: 'mutation' | 'page' = 'mutation'
): Promise<{ userId: string }> {
  const { userId, mfaComplete } = await getAuthenticatedSession();
  // Finish both sign-in steps before the role is looked up or granted.
  if (!mfaComplete) {
    redirect('/auth/mfa/totp');
  }
  await assertSuperAdmin(userId);
  const disabledOrUnknown =
    access === 'page' ? await isConfirmedDisabled(userId) : await isDisabledOrUnknown(userId);
  if (disabledOrUnknown) {
    try {
      await SessionNode.revokeAllSessionsForUser(userId);
    } catch {
      /* best-effort; the redirect below still denies access */
    }
    redirect('/auth');
  }
  return { userId };
}
