import { config } from '@/app/config';

type RequestConfig = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Overrides the default platform backend for this one call, so a caller can
   * target a specific environment. Omit to use `config.api.baseUrl`.
   */
  baseUrl?: string;
};

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  requestConfig?: RequestConfig
): Promise<{ data: T; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.api.timeout);

  try {
    const baseUrl = requestConfig?.baseUrl ?? config.api.baseUrl;
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...requestConfig?.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: requestConfig?.signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: T = await response.json();
    return { data, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}

export const httpClient = {
  get: <T>(url: string, cfg?: RequestConfig) => request<T>('GET', url, undefined, cfg),
  post: <T>(url: string, body?: unknown, cfg?: RequestConfig) => request<T>('POST', url, body, cfg),
  put: <T>(url: string, body?: unknown, cfg?: RequestConfig) => request<T>('PUT', url, body, cfg),
  patch: <T>(url: string, body?: unknown, cfg?: RequestConfig) =>
    request<T>('PATCH', url, body, cfg),
  delete: <T>(url: string, cfg?: RequestConfig) => request<T>('DELETE', url, undefined, cfg),
};
