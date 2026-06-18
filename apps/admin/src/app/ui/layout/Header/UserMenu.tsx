'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FaCaretDown } from 'react-icons/fa6';
import { IoLogOutOutline, IoSettingsOutline } from 'react-icons/io5';
import { signOut } from 'supertokens-auth-react/recipe/emailpassword';

export function UserMenu({
  email,
  firstName,
  lastName,
}: Readonly<{
  email: string;
  firstName: string | null;
  lastName: string | null;
}>) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // SuperTokens can throw on a stale session, anti-CSRF mismatch, or
      // network blip. Sign-out is user-initiated cleanup — treat it as
      // best-effort and never crash the page. Cookies still get cleared below.
    }
    // POST to /api/signout so the server clears all auth cookies with the
    // correct Path/Secure/SameSite attributes. GET is intentionally removed
    // from that route to prevent CSRF-triggered logouts.
    try {
      await fetch('/api/signout', { method: 'POST' });
    } catch {
      /* network failure — proceed to /auth regardless */
    }
    globalThis.location.href = '/auth';
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const emailLocal = email.split('@')[0] || email;
  const fallbackName = emailLocal.split(/[._-]/)[0] || emailLocal;
  const displayName = firstName ?? (fullName || fallbackName);
  const initial = (firstName ?? fallbackName).charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="yc-profile-wrap">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={open ? 'yc-profile-trigger yc-header-trigger-open' : 'yc-profile-trigger'}
      >
        <span className="yc-header-avatar" aria-hidden>
          {initial}
        </span>
        <span className="yc-profile-name">{displayName}</span>
        <FaCaretDown size={15} className={open ? 'yc-chevron-open' : undefined} />
      </button>

      {open ? (
        <div role="menu" className="yc-header-dropdown-panel">
          <div className="yc-header-dropdown-title">Account</div>
          {fullName ? (
            <div className="yc-header-dropdown-meta" title={fullName}>
              {fullName}
            </div>
          ) : null}
          <div className="yc-header-dropdown-meta" title={email}>
            {email}
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="yc-menu-row"
            role="menuitem"
          >
            <IoSettingsOutline className="yc-menu-row-icon" aria-hidden />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="yc-menu-row yc-menu-row-danger"
            role="menuitem"
          >
            <IoLogOutOutline className="yc-menu-row-icon" aria-hidden />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
