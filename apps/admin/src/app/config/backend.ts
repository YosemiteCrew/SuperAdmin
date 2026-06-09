import SuperTokens from 'supertokens-node';
import EmailPasswordNode from 'supertokens-node/recipe/emailpassword';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import { TypeInput } from 'supertokens-node/types';

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
