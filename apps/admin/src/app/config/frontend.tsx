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

/**
 * Themes SuperTokens' prebuilt MFA/TOTP screens to match the custom auth UI
 * (`.yc-auth-*` in globals.css): Satoshi type, near-black pill buttons, the
 * brand-blue links, and the same card/input treatment. Shared by both the
 * MultiFactorAuth and TOTP recipes so every prebuilt screen renders identically.
 * Palette values are space-separated RGB triplets, per SuperTokens' convention.
 */
const PREBUILT_AUTH_STYLE = `
  [data-supertokens~="container"] {
    --palette-primary: 48, 47, 46;
    --palette-primaryBorder: 41, 40, 39;
    --palette-background: 255, 255, 255;
    --palette-inputBackground: 255, 255, 255;
    --palette-inputBorder: 233, 230, 227;
    --palette-textTitle: 29, 28, 27;
    --palette-textLabel: 48, 47, 46;
    --palette-textPrimary: 48, 47, 46;
    --palette-textInput: 29, 28, 27;
    --palette-textLink: 0, 124, 245;
    --palette-buttonText: 255, 255, 255;
    --palette-error: 234, 55, 41;
    --palette-textGray: 143, 137, 132;
    font-family: 'Satoshi', sans-serif;
    border: 1px solid rgba(48, 47, 46, 0.06);
    border-radius: 24px;
    box-shadow:
      0 1px 2px rgba(29, 28, 27, 0.04),
      0 4px 12px rgba(29, 28, 27, 0.08),
      0 16px 40px rgba(29, 28, 27, 0.12);
  }
  [data-supertokens~="headerTitle"] {
    font-size: 1.75rem;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  [data-supertokens~="input"] {
    border-radius: 16px;
    font-family: 'Satoshi', sans-serif;
  }
  [data-supertokens~="inputContainer"] [data-supertokens~="inputWrapper"] {
    border-radius: 16px;
  }
  [data-supertokens~="button"] {
    border-radius: 16px;
    min-height: 3.25rem;
    font-size: 1.0625rem;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  [data-supertokens~="superTokensBranding"] {
    display: none;
  }
`;

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
        style: PREBUILT_AUTH_STYLE,
      }),
      TOTPReact.init({ style: PREBUILT_AUTH_STYLE }),
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
