import EmailPasswordReact from 'supertokens-auth-react/recipe/emailpassword';
import SessionReact from 'supertokens-auth-react/recipe/session';
import MultiFactorAuthReact from 'supertokens-auth-react/recipe/multifactorauth';
import TOTPReact from 'supertokens-auth-react/recipe/totp';
import { appInfo } from './appInfo';
import { useRouter } from 'next/navigation';
import { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';

const routerInfo: { router?: ReturnType<typeof useRouter>; pathName?: string } = {};

export function setRouter(router: ReturnType<typeof useRouter>, pathName: string) {
  routerInfo.router = router;
  routerInfo.pathName = pathName;
}

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo,
    getRedirectionURL: async (context) => {
      if (context.action === 'SUCCESS' && context.newSessionCreated) {
        return '/dashboard';
      }
      return undefined;
    },
    recipeList: [
      EmailPasswordReact.init(),
      SessionReact.init(),
      MultiFactorAuthReact.init({
        firstFactors: [MultiFactorAuthReact.FactorIds.EMAILPASSWORD],
      }),
      TOTPReact.init(),
    ],
    windowHandler: (original) => ({
      ...original,
      location: {
        ...original.location,
        getPathName: () => routerInfo.pathName!,
        assign: (url) => routerInfo.router!.push(url.toString()),
        setHref: (url) => routerInfo.router!.push(url.toString()),
      },
    }),
  };
};
