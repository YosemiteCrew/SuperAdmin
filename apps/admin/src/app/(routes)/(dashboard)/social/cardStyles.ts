/** Shared card chrome for the Social page's per-network panels. */
export const CARD =
  'rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]';

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Lists the env vars a network still needs, shared by both unconfigured cards. */
export const KEY_HINT =
  'Generate the token key with `openssl rand -hex 32`. It encrypts the stored credentials - changing it later forces a reconnect.';
