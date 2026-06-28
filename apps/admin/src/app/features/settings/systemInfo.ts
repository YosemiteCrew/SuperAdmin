export interface SystemInfoRow {
  label: string;
  value: string;
}

/** Returns just the host of a connection URI, or a dash if it can't be parsed. */
export function maskCoreHost(uri: string | undefined): string {
  if (!uri) return '—';
  try {
    return new URL(uri).host || '—';
  } catch {
    return '—';
  }
}

export interface SystemInfoInput {
  nodeEnv: string | undefined;
  buildSha: string | undefined;
  apiConfigured: boolean;
  coreHost: string;
  auditRetention: number;
}

/** Builds the read-only rows shown in the Settings → System card. */
export function buildSystemInfo({
  nodeEnv,
  buildSha,
  apiConfigured,
  coreHost,
  auditRetention,
}: SystemInfoInput): SystemInfoRow[] {
  return [
    { label: 'Environment', value: nodeEnv || 'development' },
    { label: 'Build', value: buildSha ? buildSha.slice(0, 7) : 'local' },
    {
      label: 'Organizations backend',
      value: apiConfigured ? 'Connected' : 'Not configured (set NEXT_PUBLIC_API_URL)',
    },
    { label: 'SuperTokens core', value: coreHost },
    { label: 'Audit retention', value: `${auditRetention} most-recent events` },
  ];
}
