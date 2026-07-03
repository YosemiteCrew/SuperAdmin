import 'server-only';

import SuperTokens from 'supertokens-node';

import { DEFAULT_TENANT_ID } from '@/app/constants';

export type RecipientAudience = 'all' | 'admins';

const PAGE_SIZE = 500;

/**
 * Resolves the email list for a campaign audience or contact sync. The
 * all-users audience walks the full pagination; admins reads a single page
 * (the panel's admin population is far below one page).
 */
export async function fetchRecipientEmails(audience: RecipientAudience): Promise<string[]> {
  if (audience === 'admins') {
    const { users } = await SuperTokens.getUsersOldestFirst({
      tenantId: DEFAULT_TENANT_ID,
      limit: PAGE_SIZE,
    });
    return users.map((u) => u.emails[0]).filter(Boolean);
  }

  const emails: string[] = [];
  let paginationToken: string | undefined;

  do {
    const page = await SuperTokens.getUsersOldestFirst({
      tenantId: DEFAULT_TENANT_ID,
      limit: PAGE_SIZE,
      paginationToken,
    });
    for (const u of page.users) {
      if (u.emails[0]) emails.push(u.emails[0]);
    }
    paginationToken = page.nextPaginationToken;
  } while (paginationToken);

  return emails;
}
