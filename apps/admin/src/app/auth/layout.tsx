import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="yc-auth-shell">
      <header className="yc-auth-guest-header">
        <Link
          href="/auth"
          aria-label="Yosemite Crew Super Admin home"
          className="yc-auth-guest-logo"
        >
          <Image
            src="/yosemite-crew-logo.png"
            alt="Yosemite Crew"
            width={52}
            height={52}
            priority
            style={{ width: 'auto' }}
          />
          <span className="yc-auth-guest-wordmark">Super Admin</span>
        </Link>
      </header>
      <main id="main-content" className="yc-auth-stage" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
