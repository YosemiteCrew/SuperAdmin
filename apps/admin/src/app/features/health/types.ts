export type ServiceStatus = 'ok' | 'error';

export interface HealthCheck {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

export interface MemorySnapshot {
  rssmb: number;
  heapUsedMb: number;
  heapTotalMb: number;
}

export interface SystemHealth {
  supertokens: HealthCheck;
  totalUsers: number;
  adminCount: number;
  memory: MemorySnapshot;
  uptimeSec: number;
  nodeVersion: string;
  env: string;
  buildSha: string;
}
