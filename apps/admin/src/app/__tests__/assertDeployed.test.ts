/**
 * @jest-environment node
 */

type DeployedResult = {
  sha: string | null;
  reason: string | null;
  terminal?: boolean;
};

const { main, parseArgs, readDeployedSha } = jest.requireActual<{
  main(argv?: string[]): Promise<number>;
  parseArgs(argv: string[]): Record<string, string>;
  readDeployedSha(url: string): Promise<DeployedResult>;
}>('../../ci/assert-deployed');

const EXPECTED_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
  jsonError = false
): Response {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null },
    json: async () => {
      if (jsonError) throw new Error('invalid JSON');
      return body;
    },
  } as unknown as Response;
}

describe('assert-deployed', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('parses flag-value pairs', () => {
    expect(parseArgs(['--url', 'https://example.test/health', '--sha', EXPECTED_SHA])).toEqual({
      url: 'https://example.test/health',
      sha: EXPECTED_SHA,
    });
  });

  it.each([
    [['url', 'value'], 'expected a --flag'],
    [['--url'], '--url has no value'],
  ])('rejects malformed arguments', (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });

  it('reports the underlying network error code', async () => {
    fetchSpy.mockRejectedValue(
      Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } })
    );

    await expect(readDeployedSha('https://example.test/health')).resolves.toEqual({
      sha: null,
      reason: 'unreachable (ENOTFOUND)',
    });
  });

  it.each([
    [Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }), 'ECONNRESET'],
    [new TypeError('fetch failed'), 'TypeError'],
  ])('falls back through the available network error identity', async (error, code) => {
    fetchSpy.mockRejectedValue(error);

    await expect(readDeployedSha('https://example.test/health')).resolves.toEqual({
      sha: null,
      reason: `unreachable (${code})`,
    });
  });

  it('treats a Basic challenge as a terminal routing failure', async () => {
    fetchSpy.mockResolvedValue(response(401, null, { 'www-authenticate': 'Basic realm="Login"' }));

    await expect(readDeployedSha('https://example.test/health')).resolves.toEqual({
      sha: null,
      terminal: true,
      reason: 'HTTP 401 with a Basic challenge - the /api/health exemption appears to be gone',
    });
  });

  it('keeps ordinary HTTP failures retryable', async () => {
    fetchSpy.mockResolvedValue(response(503, null));

    await expect(readDeployedSha('https://example.test/health')).resolves.toEqual({
      sha: null,
      reason: 'HTTP 503',
    });
  });

  it.each([
    [response(200, null, {}, true), 'response is not JSON'],
    [response(200, null), 'buildSha absent or null'],
    [response(200, { buildSha: null }), 'buildSha absent or null'],
    [response(200, { buildSha: 'HEAD' }), 'buildSha is not an object name ("HEAD")'],
  ])('reports an unusable health response', async (healthResponse, reason) => {
    fetchSpy.mockResolvedValue(healthResponse);

    await expect(readDeployedSha('https://example.test/health')).resolves.toEqual({
      sha: null,
      reason,
    });
  });

  it('returns a valid deployed object name', async () => {
    fetchSpy.mockResolvedValue(response(200, { buildSha: EXPECTED_SHA }));

    await expect(readDeployedSha('https://example.test/health')).resolves.toEqual({
      sha: EXPECTED_SHA,
      reason: null,
    });
  });

  it.each([
    [['--sha', EXPECTED_SHA], '--url and --sha are both required'],
    [['--url', 'https://example.test/health', '--sha', 'HEAD'], '--sha is not an object name'],
    [
      ['--url', 'https://example.test/health', '--sha', EXPECTED_SHA, '--timeout', 'NaN'],
      '--timeout and --interval must be numbers',
    ],
    [
      ['--url', 'https://example.test/health', '--sha', EXPECTED_SHA, '--interval', '0'],
      '--timeout and --interval must be numbers',
    ],
  ])('rejects invalid execution inputs', async (argv, message) => {
    await expect(main(argv)).rejects.toThrow(message);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('succeeds immediately when the expected commit is deployed', async () => {
    fetchSpy.mockResolvedValue(response(200, { buildSha: EXPECTED_SHA }));

    await expect(
      main(['--url', 'https://example.test/health', '--sha', EXPECTED_SHA])
    ).resolves.toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls.flat().join('\n')).toContain('DEPLOYED:');
  });

  it('fails when the deadline expires on another commit', async () => {
    fetchSpy.mockResolvedValue(response(200, { buildSha: OTHER_SHA }));

    await expect(
      main(['--url', 'https://example.test/health', '--sha', EXPECTED_SHA, '--timeout', '0'])
    ).resolves.toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls.flat().join('\n')).toContain('NOT DEPLOYED:');
  });

  it('escapes line breaks from response diagnostics before logging', async () => {
    fetchSpy.mockRejectedValue(
      Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND\nFORGED' } })
    );

    await expect(
      main(['--url', 'https://example.test/health', '--sha', EXPECTED_SHA, '--timeout', '0'])
    ).resolves.toBe(1);
    const output = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join('\n');
    expect(output).not.toContain('ENOTFOUND\nFORGED');
    expect(output).toContain('ENOTFOUND_FORGED');
  });

  it('stops immediately when the Basic Auth exemption is gone', async () => {
    fetchSpy.mockResolvedValue(response(401, null, { 'www-authenticate': 'Basic realm="Login"' }));

    await expect(
      main(['--url', 'https://example.test/health', '--sha', EXPECTED_SHA])
    ).resolves.toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls.flat().join('\n')).toContain('terminal condition - not retrying');
    expect(errorSpy.mock.calls.flat().join('\n')).toContain('COULD NOT READ THE DEPLOYED COMMIT');
  });

  it('retries a previous artifact and succeeds when the expected commit appears', async () => {
    jest.useFakeTimers();
    fetchSpy
      .mockResolvedValueOnce(response(200, { buildSha: OTHER_SHA }))
      .mockResolvedValueOnce(response(200, { buildSha: EXPECTED_SHA }));

    const result = main([
      '--url',
      'https://example.test/health',
      '--sha',
      EXPECTED_SHA,
      '--timeout',
      '1',
      '--interval',
      '0.01',
    ]);
    await jest.runOnlyPendingTimersAsync();

    await expect(result).resolves.toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
