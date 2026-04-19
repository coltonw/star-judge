import type { Context } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
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

// Cloudflare Access JWT validation for admin routes.
// In production, Cloudflare Access injects the CF-Access-Jwt-Assertion header
// and validates it before the request reaches the Worker. This middleware
// provides an extra server-side check.
async function requireAdmin(c: Context<{ Bindings: Bindings; Variables: RequestIdVars }>, next: () => Promise<void>) {
  const jwt = c.req.header('CF-Access-Jwt-Assertion');

  // In local dev (wrangler dev), skip auth if ENVIRONMENT is development
  if (c.env.ENVIRONMENT === 'development') {
    return next();
  }

  if (!jwt) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // When deployed, Cloudflare Access has already validated the JWT.
  // We trust the header presence as confirmation of a valid session.
  // For extra hardening, validate the JWT signature against the CF Access certs.
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
