import { redirect } from 'next/navigation';
import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { requireSuperAdmin } from '@/app/config/backend';
import { Header } from '@/app/ui/layout/Header';
import { Sidebar } from '@/app/ui/layout/Sidebar';
import { CommandPalette } from '@/app/ui/overlays/CommandPalette';
import styles from '@/app/ui/layout/shell.module.css';

type SessionResult = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

async function requireSession(): Promise<SessionResult> {
  const { userId } = await requireSuperAdmin();

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

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { email, firstName, lastName } = await requireSession();

  return (
    <div className={styles.shellRoot}>
      <Sidebar />
      <div className={styles.shellMain}>
        <Header email={email} firstName={firstName} lastName={lastName} />
        <main id="main-content" className={styles.shellContent} tabIndex={-1}>
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
