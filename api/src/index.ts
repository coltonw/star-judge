import type { Context } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as jose from 'jose';
import type { Bindings } from './env';
import { type RequestIdVars, requestId } from './middleware/request-id';
import { ballotsRouter } from './routes/ballots';
import { bggRouter } from './routes/bgg';
import { tallyRouter } from './routes/tally';
import { votesRouter } from './routes/votes';

const app = new Hono<{ Bindings: Bindings; Variables: RequestIdVars }>();

app.use('*', requestId);
app.use('*', logger());
const ALLOWED_ORIGINS = new Set(['https://star-judge.pages.dev', 'https://star-judge.willcolton.com']);

app.use(
  '/api/*',
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.has(origin) || origin.startsWith('http://localhost:') ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'CF-Access-Jwt-Assertion'],
    credentials: true,
  })
);

// Cache JWKS per isolate lifetime to avoid fetching on every request.
let jwksCache: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

async function requireAdmin(c: Context<{ Bindings: Bindings; Variables: RequestIdVars }>, next: () => Promise<void>) {
  if (c.env.ENVIRONMENT === 'development') return next();

  const token = c.req.header('CF-Access-Jwt-Assertion');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    if (!jwksCache) {
      jwksCache = jose.createRemoteJWKSet(
        new URL(`https://${c.env.CF_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`)
      );
    }
    await jose.jwtVerify(token, jwksCache, { audience: c.env.CF_ACCESS_AUD });
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
}

// Public routes
app.route('/api/ballots', ballotsRouter);
app.route('/api/votes', votesRouter);
app.route('/api/tally', tallyRouter);
app.route('/api/bgg', bggRouter);

// Admin routes — same routers re-mounted under /api/admin with auth middleware
app.use('/api/admin/*', requireAdmin);
app.route('/api/admin/ballots', ballotsRouter);

app.get('/', (c) => c.json({ ok: true, service: 'star-judge-api' }));

export default app;
