import SuperTokens from 'supertokens-node';
import EmailVerificationNode from 'supertokens-node/recipe/emailverification';

import { DEFAULT_TENANT_ID } from '@/app/constants';

/**
 * Admin override for a user's email-verification state. Applies to every email
 * login method on the account. Verifying mints and immediately consumes a
 * verification token (no email is sent); un-verifying clears the flag.
 */
export async function setEmailVerified(userId: string, verified: boolean): Promise<void> {
  const user = await SuperTokens.getUser(userId);
  if (!user) return;

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
        await EmailVerificationNode.verifyEmailUsingToken(tenantId, token.token);
      }
    } else {
      await EmailVerificationNode.unverifyEmail(method.recipeUserId, method.email);
    }
  }
}
