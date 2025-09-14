export const config = { runtime: 'edge' };

function unauthorizedResponse(realm = 'Protected') {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"` },
  });
}

function parseBasicAuth(header: string | null): { username: string; password: string } | null {
  if (!header) return null;
  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;
  try {
    const decoded = atob(encoded);
    const i = decoded.indexOf(':');
    if (i === -1) return { username: decoded, password: '' };
    return { username: decoded.slice(0, i), password: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  // Only enforce on production
  const isProd = (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production';
  if (!isProd) {
    // In development, serve the static files directly
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(await fetch(new URL('/index.html', req.url)).then(r => r.text()), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    // For other files, try to serve them directly
    try {
      const response = await fetch(req.url);
      if (response.ok) {
        return response;
      }
    } catch {}
    return new Response('Not found', { status: 404 });
  }

  // Allow health checks or internal loop prevention via header
  const bypass = req.headers.get('x-auth-checked') === '1';
  if (bypass) {
    // Serve the actual static files after authentication
    const url = new URL(req.url);
    try {
      const response = await fetch(req.url);
      if (response.ok) {
        return response;
      }
    } catch {}
    return new Response('Not found', { status: 404 });
  }

  // Expected credentials from environment
  const combo = (process.env.BASIC_AUTH || process.env.SITE_BASIC_AUTH || '').trim();
  let expectedUser = process.env.BASIC_AUTH_USER || process.env.SITE_BASIC_AUTH_USER || '';
  let expectedPass = process.env.BASIC_AUTH_PASS || process.env.SITE_BASIC_AUTH_PASS || '';
  if (combo && (!expectedUser || !expectedPass)) {
    const idx = combo.indexOf(':');
    if (idx !== -1) {
      expectedUser = combo.slice(0, idx);
      expectedPass = combo.slice(idx + 1);
    }
  }

  // If not configured, allow through (no-op)
  if (!expectedUser && !expectedPass) {
    const headers = new Headers(req.headers);
    headers.set('x-auth-checked', '1');
    const fwd = new Request(req.url, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : (req as any).body,
      redirect: 'manual',
    });
    return fetch(fwd);
  }

  const creds = parseBasicAuth(req.headers.get('authorization'));
  if (!creds) return unauthorizedResponse();

  const ok = creds.username === expectedUser && creds.password === expectedPass;
  if (!ok) return unauthorizedResponse();

  // Authentication successful - serve the requested resource
  const url = new URL(req.url);
  
  // Try to serve the requested file directly
  try {
    const response = await fetch(req.url);
    if (response.ok) {
      return response;
    }
  } catch {}
  
  // If direct fetch fails, try serving index.html for SPA routes
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const indexResponse = await fetch(new URL('/index.html', req.url));
      return new Response(indexResponse.body, {
        status: indexResponse.status,
        statusText: indexResponse.statusText,
        headers: indexResponse.headers
      });
    } catch {}
  }
  
  return new Response('Not found', { status: 404 });
}
