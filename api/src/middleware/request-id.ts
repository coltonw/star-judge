import type { Context } from 'hono';
import type { Bindings } from '../env';

// Attaches a correlation ID to each request. Uses an incoming X-Request-ID if
// provided (e.g. from Cloudflare's cf-ray) so logs downstream of the Worker
// share the same id; otherwise generates a fresh UUID. The id is echoed back
// in the response header and stored on the context for use in logs.
export type RequestIdVars = { requestId: string };

export async function requestId(
  c: Context<{ Bindings: Bindings; Variables: RequestIdVars }>,
  next: () => Promise<void>
) {
  const incoming = c.req.header('X-Request-ID') ?? c.req.header('cf-ray');
  const id = incoming ?? crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-ID', id);
  await next();
}
