import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import { headers } from 'next/headers';

import './globals.css';
import { SuperTokensProvider } from './components/supertokensProvider';
import { APP_NAME } from './constants';
import { SkipLink } from './ui/layout/SkipLink';

const LOGO_PATH = '/yosemite-crew-logo.png?v=2';

// Serif display face for page titles in the warm-bone language. Self-hosted by
// next/font at build time, so it needs no external font origin in the CSP.
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-newsreader',
});

// Runs before paint to set the theme from the saved preference (or the system
// setting), preventing a flash of the wrong theme. Kept tiny and dependency-free.
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||((t==='system'||!t)&&m);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    template: `%s - ${APP_NAME}`,
    default: APP_NAME,
  },
  description: 'Yosemite Crew internal management dashboard',
  icons: {
    icon: LOGO_PATH,
    shortcut: LOGO_PATH,
    apple: LOGO_PATH,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request nonce set by middleware; lets the inline theme script satisfy
  // the strict (Report-Only) CSP without 'unsafe-inline'.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" className={newsreader.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <SkipLink />
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
