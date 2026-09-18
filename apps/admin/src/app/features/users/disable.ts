import 'server-only';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

/**
 * Durably disables an account and reports whether its state changed, so callers
 * audit only real changes. An account that is already disabled keeps its
 * original disabledAt. The exception is a disable owned by an approval
 * rejection: a manual Disable takes it over (clears rejectionDisabled) so a
 * later approval no longer lifts it, which is a real change.
 */
export async function disableAccount(userId: string): Promise<boolean> {
  const { metadata } = await UserMetadataNode.getUserMetadata(userId);
  if (typeof metadata.disabledAt === 'number') {
    if (metadata.rejectionDisabled !== true) return false;
    await UserMetadataNode.updateUserMetadata(userId, { rejectionDisabled: null });
    return true;
  }
  await UserMetadataNode.updateUserMetadata(userId, { disabledAt: Date.now() });
  return true;
}
