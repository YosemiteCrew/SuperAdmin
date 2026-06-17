export {};

function loadLogger() {
  return jest.requireActual<typeof import('@/app/lib/logger')>('@/app/lib/logger');
}

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
  });
}

describe('logger', () => {
  const consoleSpies = {
    debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  };

  afterEach(() => {
    Object.values(consoleSpies).forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    Object.values(consoleSpies).forEach((spy) => spy.mockRestore());
  });

  it('is a no-op when NODE_ENV is test (default)', () => {
    jest.isolateModules(() => {
      const { logger } = loadLogger();
      logger.info('hi');
      logger.error('boom');
      expect(consoleSpies.info).not.toHaveBeenCalled();
      expect(consoleSpies.error).not.toHaveBeenCalled();
    });
  });

  it('emits human-readable lines in development', () => {
    const original = process.env.NODE_ENV;
    setNodeEnv('development');
    jest.isolateModules(() => {
      const { logger } = loadLogger();
      logger.info('hello', { user: 'shreyas' });
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
      const arg = consoleSpies.info.mock.calls[0][0] as string;
      expect(arg).toMatch(/^\[INFO\] hello/);
      expect(arg).toContain('"user":"shreyas"');
    });
    setNodeEnv(original);
  });

  it('emits structured JSON in production', () => {
    const original = process.env.NODE_ENV;
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { logger } = loadLogger();
      logger.error('boom', { code: 42 });
      expect(consoleSpies.error).toHaveBeenCalledTimes(1);
      const arg = consoleSpies.error.mock.calls[0][0] as string;
      const parsed = JSON.parse(arg);
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('boom');
      expect(parsed.code).toBe(42);
      expect(parsed.timestamp).toBeDefined();
    });
    setNodeEnv(original);
  });
});
