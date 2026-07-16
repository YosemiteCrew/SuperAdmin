import 'server-only';

import supertokens from 'supertokens-node';

import { DEFAULT_TENANT_ID } from '@/app/constants';

export interface LinkedAccount {
  userId: string;
  signedUpAt: number;
}

/**
 * Resolves which of the given contact emails belong to signed-up accounts,
 * computed at read time so a signup that happened AFTER the contact is always
 * reflected. A lookup failure for one email simply omits it (the request still
 * renders as an un-linked prospect).
 */
export async function linkEmailsToAccounts(
  emails: string[]
): Promise<Map<string, LinkedAccount>> {
  const unique = Array.from(new Set(emails.map((e) => e.toLowerCase())));
  const entries = await Promise.all(
    unique.map(async (email): Promise<[string, LinkedAccount] | null> => {
      try {
        const users = await supertokens.listUsersByAccountInfo(DEFAULT_TENANT_ID, { email });
        // Case-insensitive compare: the core may store the email with different
        // casing than the (lowercased) contact email, and a case-sensitive
        // `includes` would wrongly discard a real account match.
        const match = users.find((u) => u.emails.some((e) => e.toLowerCase() === email));
        if (!match) return null;
        return [email, { userId: match.id, signedUpAt: match.timeJoined }];
      } catch {
        return null;
      }
    })
  );

  const map = new Map<string, LinkedAccount>();
  for (const entry of entries) {
    if (entry) map.set(entry[0], entry[1]);
  }
  return map;
}
