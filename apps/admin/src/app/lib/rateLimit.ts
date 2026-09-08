import { NextResponse, type NextRequest } from 'next/server';

import { clientIp } from '@/app/lib/clientIp';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

type Entry = { count: number; windowStart: number };
const store = new Map<string, Entry>();

function evictStale(now: number): void {
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS * 2) store.delete(key);
  }
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  evictStale(now);
  const entry = store.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetMs: now + WINDOW_MS };
  }
  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining,
    resetMs: entry.windowStart + WINDOW_MS,
  };
}

export function rateLimitResponse(request: NextRequest, bucket: string): NextResponse | null {
  const { allowed, resetMs } = checkRateLimit(`${bucket}:${clientIp(request)}`);
  if (allowed) return null;
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((resetMs - Date.now()) / 1000)) } }
  );
}

/** Reset the in-process store. Only call this in tests. */
export function __resetForTest(): void {
  store.clear();
}
