import { checkRateLimit, __resetForTest } from '@/app/lib/rateLimit';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

beforeEach(() => {
  __resetForTest();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('checkRateLimit', () => {
  it('allows the first N requests within a window', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      const result = checkRateLimit('1.2.3.4');
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the (N+1)th request in the same window', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit('1.2.3.4');
    }
    const result = checkRateLimit('1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after the window has elapsed', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit('1.2.3.4');
    }
    // Advance past the window
    jest.advanceTimersByTime(WINDOW_MS + 1);
    for (let i = 0; i < MAX_REQUESTS; i++) {
      const result = checkRateLimit('1.2.3.4');
      expect(result.allowed).toBe(true);
    }
  });

  it('tracks two IPs independently', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit('1.1.1.1');
    }
    // IP A is now exhausted; IP B should still have a full window
    const resultA = checkRateLimit('1.1.1.1');
    const resultB = checkRateLimit('2.2.2.2');
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('evicts stale entries after 2× the window', () => {
    checkRateLimit('5.5.5.5');
    jest.advanceTimersByTime(WINDOW_MS * 2 + 1);
    // Trigger a call for a different IP so eviction runs
    checkRateLimit('9.9.9.9');
    // The stale entry for 5.5.5.5 should be gone; a fresh call starts a new window
    const result = checkRateLimit('5.5.5.5');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_REQUESTS - 1);
  });

  it('returns a correct decreasing remaining count', () => {
    const results = Array.from({ length: MAX_REQUESTS }, () => checkRateLimit('3.3.3.3'));
    for (let i = 0; i < results.length; i++) {
      expect(results[i].remaining).toBe(MAX_REQUESTS - 1 - i);
    }
    // Once exhausted, remaining stays 0
    const blocked = checkRateLimit('3.3.3.3');
    expect(blocked.remaining).toBe(0);
  });

  it('returns a resetMs in the future on the first request', () => {
    const now = Date.now();
    const { resetMs } = checkRateLimit('7.7.7.7');
    expect(resetMs).toBe(now + WINDOW_MS);
  });
});
