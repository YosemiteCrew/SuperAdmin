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
 *
 * Palette values are comma-separated RGB triplets (SuperTokens builds colours as
 * `rgba(var(--palette-x), a)`). They point at the theme-aware `--*-rgb` tokens in
 * globals.css, which — because CSS custom properties inherit through the shadow
 * DOM the prebuilt UI renders into — makes these screens follow light/dark too.
 */
const PREBUILT_AUTH_STYLE = `
  [data-supertokens~="container"] {
    --palette-primary: var(--btn-rgb);
    --palette-primaryBorder: var(--btn-rgb);
    --palette-background: var(--surface-rgb);
    --palette-inputBackground: var(--surface-rgb);
    --palette-inputBorder: var(--line-rgb);
    --palette-textTitle: var(--ink-rgb);
    --palette-textLabel: var(--ink-rgb);
    --palette-textPrimary: var(--ink-rgb);
    --palette-textInput: var(--ink-rgb);
    --palette-textLink: var(--primary-rgb);
    --palette-buttonText: var(--btn-ink-rgb);
    --palette-error: 234, 55, 41;
    --palette-textGray: var(--ink-3-rgb);
    font-family: var(--font-satoshi);
    border: 1px solid var(--line);
    border-radius: 24px;
    box-shadow: var(--shadow-card);
  }
  [data-supertokens~="headerTitle"] {
    font-size: 1.75rem;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  [data-supertokens~="input"] {
    border-radius: 16px;
    font-family: var(--font-satoshi);
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
