import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SuperTokens from 'supertokens-node';
import EmailPasswordNode from 'supertokens-node/recipe/emailpassword';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';
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
          apis: (originalImplementation) => ({
            ...originalImplementation,
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
            signUpPOST: async (input) => {
              if (!originalImplementation.signUpPOST) {
                throw new Error('signUpPOST is disabled');
              }
              const response = await originalImplementation.signUpPOST(input);
              if (response.status === 'OK') {
                await touchLastSignIn(response.user.id);
              }
              return response;
            },
          }),
        },
      }),
      SessionNode.init(),
      UserMetadataNode.init(),
      UserRolesNode.init(),
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

async function isSuperAdmin(userId: string): Promise<boolean> {
  const { roles } = await UserRolesNode.getRolesForUser(DEFAULT_TENANT_ID, userId);
  if (roles.includes(SUPERADMIN_ROLE)) {
    return true;
  }

  const user = await SuperTokens.getUser(userId);
  const email = user?.emails[0]?.toLowerCase();
  if (email && serverEnv.superadminBootstrapEmails.includes(email)) {
    await grantSuperAdmin(userId);
    return true;
  }

  return false;
}

async function getAuthenticatedUserId(): Promise<string> {
  ensureSuperTokensInit();
  const cookieStore = await cookies();
  const cookieArray = cookieStore.getAll().map(({ name, value }) => ({ name, value }));
  const { accessTokenPayload, hasToken, error } = await getSSRSession(cookieArray);
  if (error || !hasToken || !accessTokenPayload || typeof accessTokenPayload.sub !== 'string') {
    redirect('/auth');
  }
  return accessTokenPayload.sub;
}

export async function assertSuperAdmin(userId: string): Promise<void> {
  ensureSuperTokensInit();
  if (!(await isSuperAdmin(userId))) {
    redirect('/forbidden');
  }
}

export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const userId = await getAuthenticatedUserId();
  await assertSuperAdmin(userId);
  return { userId };
}
