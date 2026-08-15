/**
 * @jest-environment node
 */
jest.mock('@superadmin/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@superadmin/database';
import { GET } from '@/app/api/health/route';

const mockQueryRaw = prisma.$queryRaw as unknown as jest.Mock;

type HealthBody = {
  status: string;
  database: string;
  uptime: number;
  timestamp: string;
  env: string;
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/health', () => {
  describe('when the database is reachable', () => {
    beforeEach(() => mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]));

    it('returns 200 with expected fields', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const json = (await res.json()) as HealthBody;
      expect(json.status).toBe('ok');
      expect(json.database).toBe('up');
      expect(typeof json.uptime).toBe('number');
      expect(json.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof json.timestamp).toBe('string');
      expect(typeof json.env).toBe('string');
    });

    it('emits no-store cache header', async () => {
      const res = await GET();
      expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    });

    it('probes the database rather than assuming it is up', async () => {
      await GET();
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it("falls back to 'development' when NODE_ENV is unset", async () => {
      const original = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        configurable: true,
      });
      try {
        const json = (await (await GET()).json()) as HealthBody;
        expect(json.env).toBe('development');
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', { value: original, configurable: true });
      }
    });
  });

  describe('when the database is unreachable', () => {
    beforeEach(() => mockQueryRaw.mockRejectedValue(new Error('connection refused')));

    it('reports 503 and degraded rather than ok', async () => {
      const res = await GET();
      expect(res.status).toBe(503);
      const json = (await res.json()) as HealthBody;
      expect(json.status).toBe('degraded');
      expect(json.database).toBe('down');
    });

    it('still emits no-store so a monitor never reads a cached pass', async () => {
      const res = await GET();
      expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    });

    it('does not let the query error escape the handler', async () => {
      await expect(GET()).resolves.toBeDefined();
    });
  });
});
