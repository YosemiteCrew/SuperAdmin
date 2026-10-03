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

  // Each login method is its own record, so they are updated together.
  const changes = await Promise.all(
    user.loginMethods.map(async (method) => {
      if (!method.email) return false;
      const tenantId = method.tenantIds[0] ?? DEFAULT_TENANT_ID;

      if (!verified) {
        if (!(await EmailVerificationNode.isEmailVerified(method.recipeUserId, method.email))) {
          return false;
        }
        await EmailVerificationNode.unverifyEmail(method.recipeUserId, method.email);
        return true;
      }
      const token = await EmailVerificationNode.createEmailVerificationToken(
        tenantId,
        method.recipeUserId,
        method.email
      );
      if (token.status !== 'OK') return false;
      const result = await EmailVerificationNode.verifyEmailUsingToken(tenantId, token.token);
      return result.status === 'OK';
    })
  );

  return changes.includes(true);
}
