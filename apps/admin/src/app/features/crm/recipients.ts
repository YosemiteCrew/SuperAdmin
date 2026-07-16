import 'server-only';

import SuperTokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';

export type RecipientAudience = 'all' | 'admins';

const PAGE_SIZE = 500;

/**
 * Emails of the accounts actually holding the super-admin role.
 *
 * Resolved from the role directory, never from a user listing: the audience is a
 * promise to the operator that "Super-admins only" reaches nobody else, so it
 * must be derived from the same source that grants the privilege. Reading a page
 * of users instead is what shipped in #101 - the admin population being small
 * does not make the first page of ALL users an admin list, it just makes the
 * mistake invisible until it reaches a customer's inbox.
 *
 * Throws rather than degrading if the role lookup is not OK: callers turn that
 * into a visible error, so an unresolvable admin list cancels the send instead
 * of quietly broadcasting to a wider or empty audience.
 */
async function fetchAdminEmails(): Promise<string[]> {
  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  if (roleHolders.status !== 'OK') {
    throw new Error('Could not resolve the super-admin role holders.');
  }

  const emails = await Promise.all(
    roleHolders.users.map(async (id) => {
      const user = await SuperTokens.getUser(id);
      return user?.emails[0];
    })
  );
  return emails.filter((email): email is string => Boolean(email));
}

/**
 * Resolves the email list for a campaign audience or contact sync. The all-users
 * audience walks the full pagination; the admins audience comes from the role
 * directory.
 */
export async function fetchRecipientEmails(audience: RecipientAudience): Promise<string[]> {
  if (audience === 'admins') {
    return fetchAdminEmails();
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
