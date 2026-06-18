function loadModule() {
  return jest.requireActual<typeof import('@/app/lib/reportError')>('@/app/lib/reportError');
}

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
  });
}

describe('reportError', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('is a no-op in test env', () => {
    jest.isolateModules(() => {
      const { reportError } = loadModule();
      reportError(new Error('boom'));
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  it('logs structured fields for Error instances in dev', () => {
    const original = process.env.NODE_ENV;
    setNodeEnv('development');
    jest.isolateModules(() => {
      const { reportError } = loadModule();
      reportError(new Error('boom'), { source: 'route', digest: 'abc' });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const line = errorSpy.mock.calls[0][0] as string;
      expect(line).toContain('Unhandled error');
      expect(line).toContain('"message":"boom"');
      expect(line).toContain('"source":"route"');
      expect(line).toContain('"digest":"abc"');
    });
    setNodeEnv(original);
  });

  it('serialises non-Error values via String() in prod', () => {
    const original = process.env.NODE_ENV;
    setNodeEnv('production');
    jest.isolateModules(() => {
      const { reportError } = loadModule();
      reportError('plain string');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const json = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(json.level).toBe('error');
      expect(json.message).toBe('plain string');
    });
    setNodeEnv(original);
  });
});
