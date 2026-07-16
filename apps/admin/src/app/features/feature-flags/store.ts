import 'server-only';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

import type { FeatureFlagKey } from './constants';

const storeId = (orgId: string) => `superadmin:org-flags:${orgId}`;
const FLAGS_KEY = 'flags';

export type OrgFlags = Record<FeatureFlagKey, boolean>;

const DEFAULT_FLAGS: OrgFlags = {
  activityPub: false,
  betaReporting: false,
  advancedExport: false,
};

function isPartialFlags(v: unknown): v is Partial<OrgFlags> {
  return typeof v === 'object' && v !== null;
}

export async function getOrgFlags(orgId: string): Promise<OrgFlags> {
  const { metadata } = await UserMetadataNode.getUserMetadata(storeId(orgId));
  const raw = metadata[FLAGS_KEY];
  const stored = isPartialFlags(raw) ? raw : {};
  return { ...DEFAULT_FLAGS, ...stored };
}

export async function setOrgFlag(
  orgId: string,
  flag: FeatureFlagKey,
  value: boolean
): Promise<void> {
  const current = await getOrgFlags(orgId);
  await UserMetadataNode.updateUserMetadata(storeId(orgId), {
    [FLAGS_KEY]: { ...current, [flag]: value },
  } as unknown as JSONObject);
}
