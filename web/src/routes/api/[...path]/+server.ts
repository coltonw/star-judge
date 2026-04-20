import type { RequestHandler } from './$types';

const WORKER_BASE = 'https://star-judge-api.coltonw.workers.dev';

async function proxy(event: Parameters<RequestHandler>[0]): Promise<Response> {
  const cfAuth = event.cookies.get('CF_Authorization');
  const url = `${WORKER_BASE}/api/${event.params.path}${event.url.search}`;

  const headers = new Headers(event.request.headers);
  headers.delete('host');
  if (cfAuth) headers.set('CF-Access-Jwt-Assertion', cfAuth);

  return fetch(url, {
    method: event.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(event.request.method) ? null : event.request.body,
    // @ts-expect-error CF Workers support duplex streaming
    duplex: 'half',
  });
}

export const GET: RequestHandler = proxy;
export const POST: RequestHandler = proxy;
export const PATCH: RequestHandler = proxy;
export const DELETE: RequestHandler = proxy;
export const OPTIONS: RequestHandler = proxy;
