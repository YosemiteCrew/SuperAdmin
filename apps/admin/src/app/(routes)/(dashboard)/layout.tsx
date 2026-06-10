import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import supertokens from 'supertokens-node';
import { getSSRSession } from 'supertokens-node/nextjs';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { Header } from '@/app/ui/layout/Header';
import { Sidebar } from '@/app/ui/layout/Sidebar';
import { CommandPalette } from '@/app/ui/overlays/CommandPalette';

type SessionResult = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

async function requireSession(): Promise<SessionResult> {
  ensureSuperTokensInit();

  const cookieStore = await cookies();
  const cookieArray = cookieStore.getAll().map(({ name, value }) => ({ name, value }));

  const { accessTokenPayload, hasToken, error } = await getSSRSession(cookieArray);

  if (error || !hasToken || !accessTokenPayload) {
    redirect('/auth');
  }

  const userId = accessTokenPayload.sub;
  if (typeof userId !== 'string') {
    redirect('/auth');
  }

  const user = await supertokens.getUser(userId);
  const email = user?.emails[0];
  if (!email) {
    redirect('/auth');
  }

  let firstName: string | null = null;
  let lastName: string | null = null;
  try {
    const { metadata } = await UserMetadataNode.getUserMetadata(userId);
    if (typeof metadata.firstName === 'string' && metadata.firstName.trim()) {
      firstName = metadata.firstName.trim();
    }
    if (typeof metadata.lastName === 'string' && metadata.lastName.trim()) {
      lastName = metadata.lastName.trim();
    }
  } catch {
    /* metadata failure shouldn't crash the whole dashboard */
  }

  return { email, firstName, lastName };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { email, firstName, lastName } = await requireSession();

  return (
    <div className="yc-shell">
      <Sidebar />
      <div className="yc-shell-main">
        <Header email={email} firstName={firstName} lastName={lastName} />
        <main id="main-content" className="yc-shell-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
