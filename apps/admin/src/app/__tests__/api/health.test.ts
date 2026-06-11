/**
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 with expected fields', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      status: string;
      uptime: number;
      timestamp: string;
      env: string;
    };
    expect(json.status).toBe('ok');
    expect(typeof json.uptime).toBe('number');
    expect(json.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof json.timestamp).toBe('string');
    expect(typeof json.env).toBe('string');
  });

  it('emits no-store cache header', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
  });
});
