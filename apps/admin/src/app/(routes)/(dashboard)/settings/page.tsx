import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { requireSuperAdmin } from '@/app/config/backend';

import { ProfileForm } from './ProfileForm';
import { signOutEverywhereAction } from './actions';

export const metadata: Metadata = {
  title: 'Settings',
};

const CARD =
  'rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]';

export default async function SettingsPage() {
  const { userId } = await requireSuperAdmin();
  const user = await supertokens.getUser(userId);
  const email = user?.emails[0] ?? '';

  let firstName = '';
  let lastName = '';
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    if (typeof metadata.firstName === 'string') firstName = metadata.firstName;
    if (typeof metadata.lastName === 'string') lastName = metadata.lastName;
  } catch {
    /* metadata unavailable — fall back to empty names */
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage your profile and account security.</p>
      </header>

      <section className={CARD} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-lg font-medium text-neutral-900">
          Profile
        </h2>
        <p className="mt-1 mb-4 text-sm text-neutral-600">
          Signed in as <span className="font-medium text-neutral-900">{email}</span>
        </p>
        <ProfileForm firstName={firstName} lastName={lastName} />
      </section>

      <section className={CARD} aria-labelledby="security-heading">
        <h2 id="security-heading" className="text-lg font-medium text-neutral-900">
          Security
        </h2>
        <dl className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <dt className="text-sm font-medium text-neutral-900">Password</dt>
              <dd className="text-sm text-neutral-600">Change the password for this account.</dd>
            </div>
            <Link href="/auth/reset-password" className="yc-auth-link-brand text-sm">
              Reset password
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <dt className="text-sm font-medium text-neutral-900">Two-factor authentication</dt>
              <dd className="text-sm text-neutral-600">
                TOTP (authenticator app) is required for all super admins.
              </dd>
            </div>
            <Link href="/auth/mfa/totp" className="yc-auth-link-brand text-sm">
              Manage device
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-4">
            <div>
              <dt className="text-sm font-medium text-neutral-900">Active sessions</dt>
              <dd className="text-sm text-neutral-600">
                Sign out of this account on every device.
              </dd>
            </div>
            <form action={signOutEverywhereAction}>
              <button
                type="submit"
                className="rounded-xl border border-danger-600 px-4 py-2 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
              >
                Sign out everywhere
              </button>
            </form>
          </div>
        </dl>
      </section>
    </div>
  );
}
