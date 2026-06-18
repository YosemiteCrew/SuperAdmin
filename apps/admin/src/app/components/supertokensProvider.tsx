'use client';
import React from 'react';
import SuperTokensReact, { SuperTokensWrapper } from 'supertokens-auth-react';
import { frontendConfig, setRouter } from '../config/frontend';
import { usePathname, useRouter } from 'next/navigation';

if (typeof globalThis.window !== 'undefined') {
  // Init only runs on the frontend, hence the window guard.
  SuperTokensReact.init(frontendConfig());
}

export const SuperTokensProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  setRouter(useRouter(), usePathname() || globalThis.location.pathname);

  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
