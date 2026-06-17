describe('httpClient', () => {
  const fetchMock = jest.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  function jsonResponse<T>(body: T, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  }

  it('GET returns parsed json and status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const { httpClient } = await import('@/app/services/http/client');
    const res = await httpClient.get<{ ok: boolean }>('/health');
    expect(res.data).toEqual({ ok: true });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('POST serialises the body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1 }, 201));
    const { httpClient } = await import('@/app/services/http/client');
    await httpClient.post('/users', { name: 'jane' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'jane' }));
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('PUT/DELETE delegate to the same request helper', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const { httpClient } = await import('@/app/services/http/client');
    await httpClient.put('/x', { a: 1 });
    await httpClient.delete('/x');
    expect(fetchMock.mock.calls.map((c) => (c[1] as RequestInit).method)).toEqual([
      'PUT',
      'DELETE',
    ]);
  });

  it('rejects when response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
    const { httpClient } = await import('@/app/services/http/client');
    await expect(httpClient.get('/oops')).rejects.toThrow(/HTTP 500/);
  });

  it('forwards extra headers and signal from RequestConfig', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    const { httpClient } = await import('@/app/services/http/client');
    const ctrl = new AbortController();
    await httpClient.get('/p', {
      headers: { Authorization: 'Bearer x' },
      signal: ctrl.signal,
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer x');
    expect(init.signal).toBe(ctrl.signal);
  });
});
