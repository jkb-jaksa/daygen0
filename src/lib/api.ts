const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type JsonInput = Omit<RequestInit, 'body'> & { body?: unknown };

export async function apiFetch<T>(path: string, init: JsonInput = {}): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body:
      init.body !== undefined && !(init.body instanceof FormData)
        ? JSON.stringify(init.body)
        : (init.body as BodyInit | null | undefined),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

