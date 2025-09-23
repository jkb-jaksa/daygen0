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
  // Only enforce authentication in production
  const isProd = process.env.VERCEL_ENV === 'production';
  if (!isProd) {
    // In development, serve the static files directly without auth
    return new Response('Development mode - no auth required', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Get the original path from the request
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Skip authentication for API routes and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Skip files with extensions (static assets)
  ) {
    // For API routes, let them pass through
    if (pathname.startsWith('/api/') && pathname !== '/api/auth') {
      return new Response('API route', { status: 200 });
    }
    // For static assets, try to serve them
    try {
      const response = await fetch(req.url);
      if (response.ok) {
        return response;
      }
    } catch {}
    return new Response('Not found', { status: 404 });
  }

  // Get credentials from environment variables
  const basicAuth = process.env.BASIC_AUTH || '';
  const [username, password] = basicAuth.split(':');

  // If no credentials are set, allow access
  if (!username || !password) {
    // Serve the React app
    try {
      const response = await fetch(new URL('/index.html', req.url));
      if (response.ok) {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
    } catch {}
    return new Response('Not found', { status: 404 });
  }

  // Check for authorization header
  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return unauthorizedResponse();
  }

  // Parse basic auth
  const creds = parseBasicAuth(authorization);
  if (!creds) {
    return unauthorizedResponse();
  }

  // Validate credentials
  if (creds.username !== username || creds.password !== password) {
    return unauthorizedResponse();
  }

  // Authentication successful - serve the React app
  try {
    const response = await fetch(new URL('/index.html', req.url));
    if (response.ok) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
  } catch {}

  return new Response('Not found', { status: 404 });
}
