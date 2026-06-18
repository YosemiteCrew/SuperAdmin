import type { Metadata } from 'next';

import './globals.css';
import { SuperTokensProvider } from './components/supertokensProvider';
import { APP_NAME } from './constants';
import { SkipLink } from './ui/layout/SkipLink';

const LOGO_PATH = '/yosemite-crew-logo.png?v=2';

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
      <body suppressHydrationWarning>
        <SkipLink />
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
