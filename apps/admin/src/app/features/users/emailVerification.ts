import 'server-only';
import SuperTokens from 'supertokens-node';
import EmailVerificationNode from 'supertokens-node/recipe/emailverification';

import { DEFAULT_TENANT_ID } from '@/app/constants';

/**
 * Admin override for a user's email-verification state. Applies to every email
 * login method on the account. Verifying mints and immediately consumes a
 * verification token (no email is sent); un-verifying clears the flag.
 */
export async function setEmailVerified(userId: string, verified: boolean): Promise<boolean> {
  const user = await SuperTokens.getUser(userId);
  if (!user) return false;

  let changed = false;

  for (const method of user.loginMethods) {
    if (!method.email) continue;
    const tenantId = method.tenantIds[0] ?? DEFAULT_TENANT_ID;

    if (verified) {
      const token = await EmailVerificationNode.createEmailVerificationToken(
        tenantId,
        method.recipeUserId,
        method.email
      );
      if (token.status === 'OK') {
        const result = await EmailVerificationNode.verifyEmailUsingToken(tenantId, token.token);
        changed ||= result.status === 'OK';
      }
    } else {
      if (!(await EmailVerificationNode.isEmailVerified(method.recipeUserId, method.email)))
        continue;
      await EmailVerificationNode.unverifyEmail(method.recipeUserId, method.email);
      changed = true;
    }
  }

  return changed;
}
