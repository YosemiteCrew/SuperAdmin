'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GuestHeaderCta() {
  const pathname = usePathname() ?? '/auth';
  const onSignUp = pathname.startsWith('/auth/signup');

  return (
    <Link href={onSignUp ? '/auth' : '/auth/signup'} className="yc-auth-guest-cta">
      {onSignUp ? 'Sign in' : 'Sign up'}
    </Link>
  );
}
