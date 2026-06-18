import type { Metadata } from 'next';

import './globals.css';
import { SuperTokensProvider } from './components/supertokensProvider';
import { APP_NAME } from './constants';
import { SkipLink } from './ui/layout/SkipLink';

const LOGO_PATH = '/yosemite-crew-logo.png?v=2';

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <SkipLink />
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
