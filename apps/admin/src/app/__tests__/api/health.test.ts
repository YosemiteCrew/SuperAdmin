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
  reason?: { name: string; code: string | null };
  uptime: number;
  timestamp: string;
  env: string;
};

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => errorSpy.mockRestore());

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

    it('logs the full error server-side so it is recoverable', async () => {
      await GET();
      expect(errorSpy).toHaveBeenCalledWith('[health] database probe failed', expect.any(Error));
    });

    it('omits reason entirely while healthy', async () => {
      mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const json = (await (await GET()).json()) as HealthBody;
      expect(json.reason).toBeUndefined();
    });
  });

  describe('the published reason', () => {
    it('names the error class so a missing engine is distinguishable', async () => {
      class PrismaClientInitializationError extends Error {}
      mockQueryRaw.mockRejectedValue(new PrismaClientInitializationError('engine not found'));
      const json = (await (await GET()).json()) as HealthBody;
      expect(json.reason).toEqual({ name: 'PrismaClientInitializationError', code: null });
    });

    it("carries Prisma's error code when there is one", async () => {
      const err = Object.assign(new Error('cannot reach database'), { code: 'P1001' });
      mockQueryRaw.mockRejectedValue(err);
      const json = (await (await GET()).json()) as HealthBody;
      expect(json.reason?.code).toBe('P1001');
    });

    // The endpoint is unauthenticated. Prisma embeds host, port and sometimes
    // the user in its connection error messages, so the message must never
    // reach the response body.
    it('never leaks the error message', async () => {
      mockQueryRaw.mockRejectedValue(
        new Error("Can't reach database server at aws-1-eu-central-1.pooler.supabase.com:5432")
      );
      const body = await (await GET()).text();
      expect(body).not.toContain('pooler.supabase.com');
      expect(body).not.toContain('5432');
      expect(body).not.toContain('reach database server');
    });

    it('survives a non-object being thrown', async () => {
      mockQueryRaw.mockRejectedValue('a bare string');
      const res = await GET();
      expect(res.status).toBe(503);
      const json = (await res.json()) as HealthBody;
      expect(json.reason).toEqual({ name: 'UnknownError', code: null });
    });
  });
});
