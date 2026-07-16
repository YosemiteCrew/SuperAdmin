import supertokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import type { HealthCheck, MemorySnapshot, SystemHealth } from './types';

async function checkSupertokens(): Promise<{ check: HealthCheck; totalUsers: number }> {
  const start = Date.now();
  try {
    const totalUsers = await supertokens.getUserCount();
    return {
      check: { status: 'ok', latencyMs: Date.now() - start },
      totalUsers,
    };
  } catch (err) {
    return {
      check: {
        status: 'error',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      totalUsers: 0,
    };
  }
}

async function getAdminCount(): Promise<number> {
  try {
    const result = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
    return result.status === 'OK' ? result.users.length : 0;
  } catch {
    return 0;
  }
}

function toMb(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function getMemory(): MemorySnapshot {
  const mem = process.memoryUsage();
  return {
    rssmb: toMb(mem.rss),
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
  };
}

export async function collectSystemHealth(): Promise<SystemHealth> {
  const [{ check: supertokensCheck, totalUsers }, adminCount] = await Promise.all([
    checkSupertokens(),
    getAdminCount(),
  ]);

  return {
    supertokens: supertokensCheck,
    totalUsers,
    adminCount,
    memory: getMemory(),
    uptimeSec: Math.floor(process.uptime()),
    nodeVersion: process.version,
    env: process.env.NODE_ENV ?? 'development',
    buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'local',
  };
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}
