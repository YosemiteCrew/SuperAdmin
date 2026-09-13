import 'server-only';

import { prisma } from '@superadmin/database';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

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

async function readLegacyCampaigns(): Promise<CampaignRecord[]> {
  const { metadata } = await UserMetadataNode.getUserMetadata(STORE_ID);
  const raw = metadata[KEY];
  return Array.isArray(raw) ? raw.filter(isCampaignRecord) : [];
}

function toCampaignRecord(row: Omit<CampaignRecord, 'sentAt'> & { sentAt: Date }): CampaignRecord {
  return { ...row, sentAt: row.sentAt.getTime() };
}

export async function getCampaigns(): Promise<CampaignRecord[]> {
  const [rows, legacy] = await Promise.all([
    prisma.crmCampaign.findMany({
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      take: MAX_CAMPAIGNS,
    }),
    readLegacyCampaigns(),
  ]);
  const campaigns = new Map(
    [...legacy, ...rows.map(toCampaignRecord)].map((campaign) => [campaign.id, campaign])
  );
  return [...campaigns.values()]
    .sort((a, b) => b.sentAt - a.sentAt || b.id.localeCompare(a.id))
    .slice(0, MAX_CAMPAIGNS);
}

export async function recordCampaign(record: Omit<CampaignRecord, 'id'>): Promise<CampaignRecord> {
  const campaign = await prisma.crmCampaign.create({
    data: {
      ...record,
      id: globalThis.crypto.randomUUID(),
      sentAt: new Date(record.sentAt),
    },
  });
  return toCampaignRecord(campaign);
}
