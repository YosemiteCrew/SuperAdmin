import 'server-only';

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

const STORE_ID = 'superadmin:crm-campaigns';
const KEY = 'campaigns';
const MAX_CAMPAIGNS = 50;

export type CampaignAudience = 'all' | 'admins';

export interface CampaignRecord {
  id: string;
  subject: string;
  preview: string;
  audience: CampaignAudience;
  sentCount: number;
  failedCount: number;
  sentAt: number;
  sentBy: string;
  sentByEmail: string;
}

function isCampaignRecord(v: unknown): v is CampaignRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.subject === 'string' &&
    typeof r.sentAt === 'number' &&
    typeof r.sentBy === 'string'
  );
}

async function readCampaigns(): Promise<CampaignRecord[]> {
  const { metadata } = await UserMetadataNode.getUserMetadata(STORE_ID);
  const raw = metadata[KEY];
  return Array.isArray(raw) ? raw.filter(isCampaignRecord) : [];
}

export async function getCampaigns(): Promise<CampaignRecord[]> {
  return readCampaigns();
}

export async function recordCampaign(record: Omit<CampaignRecord, 'id'>): Promise<CampaignRecord> {
  const existing = await readCampaigns();
  const campaign: CampaignRecord = {
    ...record,
    id: globalThis.crypto.randomUUID(),
  };
  const updated = [campaign, ...existing].slice(0, MAX_CAMPAIGNS);
  await UserMetadataNode.updateUserMetadata(STORE_ID, {
    [KEY]: updated,
  } as unknown as JSONObject);
  return campaign;
}
