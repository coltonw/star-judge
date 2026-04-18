# Architecture

## One-liner

Star Judge is a monorepo with two deployable apps (`api`, `web`) and two pure-TypeScript libraries (`packages/voting`, `packages/shared`). The voting engine is isolated from any Cloudflare-specific code — the api is the only thing that knows about D1.

## Topology

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│    ↓  (localStorage session UUID)                            │
│  web/  —  SvelteKit 5 + Runes  →  Cloudflare Pages           │
│    ↓  fetch('/api/...')                                      │
│  api/  —  Hono  →  Cloudflare Workers                        │
│    ↓  SQL                                                    │
│  D1    —  SQLite at the edge                                 │
└──────────────────────────────────────────────────────────────┘

Both api and web depend on:
  - @star-judge/voting    (the 8 methods, pure TS)
  - @star-judge/shared    (types + Zod schemas)
```

## Why a monorepo

Two hard-won reasons:

1. **Shared types that can't drift.** `TallyResponse`, `Grade`, `RankedCandidate` are declared once in `packages/shared/src/types.ts` and imported by both the api (to shape responses) and the web (to consume them). Zod schemas for request bodies live there too, so both sides use the exact same validation.
2. **The voting engine is testable in isolation.** `packages/voting/` has no Cloudflare dependency. You can `import { rankStar } from '@star-judge/voting'` from a Node script, a Vitest test, or a future CLI without pulling in workers-types or D1.

## Package responsibilities

| Package | Purpose | Depends on |
|---------|---------|------------|
| `packages/voting` | The 8 ranking algorithms + shared helpers (`buildGradeCounts`, `pairwiseWinner`, Copeland scoring) | `@star-judge/shared` |
| `packages/shared` | Domain types (Candidate, Ballot, Grade) + Zod schemas | nothing |
| `api` | Hono Worker: routes for ballots, votes, tally, BGG proxy; admin auth via Cloudflare Access | both packages |
| `web` | SvelteKit app: vote form, tally page, admin panel, methods reference | both packages |

## Request flow: casting a vote

1. Browser POSTs `/api/votes` with `{ ballotId, sessionId, voterName, ratings }`.
2. Hono applies `requestId` middleware (correlates logs), then `cors`, then the `votesRouter`.
3. `votesRouter` validates the body with `voteSchema` from `@star-judge/shared`.
4. Inserts into D1 `votes` table with `UNIQUE(ballot_id, session_id)` — collision returns 409, which the web UI surfaces as "you've already voted on this ballot."
5. Response headers include `X-Request-ID` for correlation.

## Request flow: tallying

1. Browser GETs `/api/tally/:id`.
2. Worker loads the ballot and all votes from D1.
3. Runs the ballot+votes through every method in `@star-judge/voting` in sequence — no per-method DB queries.
4. Returns a single `TallyResponse` with ranked candidates for all 8 methods plus `condorcetParadox` and `dictatorName` flags.
5. `Cache-Control: public, max-age=10, s-maxage=10` — CDN edge caches for 10 seconds. For a live vote night with 30 viewers refreshing every 5s, that's ~1 Worker invocation per 10 seconds instead of 6 per second.

## Auth model

**Admin routes** (`/api/admin/*`) are protected by **Cloudflare Access** — OAuth via Google/GitHub, entirely managed by Cloudflare. Cloudflare validates the JWT and adds a `CF-Access-Jwt-Assertion` header before the request reaches the Worker. The Worker's `requireAdmin` middleware confirms the header is present. In local dev (`ENVIRONMENT=development && !CLOUDFLARE_ACCESS_AUD`), auth is skipped.

**Voter identity** is a UUID in `localStorage`. Honor-system — someone could clear storage and vote again. Double-vote prevention is enforced at the DB level by `UNIQUE(ballot_id, session_id)`. Voters can update their existing vote.

## Why Hono (and not SvelteKit server routes)

Chosen deliberately as an excuse to learn Hono. The app is small enough that collapsing the api into SvelteKit `+server.ts` routes would work, but losing the clean api/web split would sacrifice the packages/voting isolation and make it harder to swap either side. Hono also gives:

- First-class Cloudflare Workers ergonomics (typed `Bindings`, edge-first middleware)
- Zero cold-start overhead
- Middleware composition that's pleasant to reason about

## Why no ORM

Queries in `api/src/db/queries.ts` are hand-written `db.prepare(...).bind(...).all()` calls. The schema has four tables and about a dozen queries — an ORM would be net overhead. If the schema ever grows past that, swap in Drizzle (Cloudflare D1 is a first-class target).

## Mock scenarios

`web/src/lib/mock-scenarios.ts` contains hand-crafted `TallyResponse` fixtures — Tennessee Capital, Condorcet cycles, runoff flips, four-way disagreement. These hit a non-numeric ballot ID (`/tally/mock-tennessee`) and bypass the api entirely; the tally page detects a non-numeric ID and loads the fixture synchronously. This lets the educational scenarios work in prod even when no ballot exists, and serves as a zero-dependency test bed for the voting engine at a UI level.

## Testing layers

| Layer | Where | What it catches |
|-------|-------|-----------------|
| Unit (voting) | `packages/voting/src/*.test.ts` | Algorithm correctness on constructed edge cases (56 tests) |
| Unit (web) | `web/src/**/*.test.ts` | Consensus derivation, mock scenario round-trip, form validation (106 tests) |
| Component | `web/src/lib/components/*.test.ts` | Render contract for MethodCard + TallyChart |
| Integration (api) | `api/src/routes/*.test.ts` | Full request/response through Hono + miniflare D1 (9 tests) |

No Playwright E2E yet — once deployed, real E2E against production is higher-signal than local wrangler orchestration.

## Deployment boundaries

- `api/` deploys to Cloudflare Workers (`wrangler deploy`). Single Worker, single D1 binding.
- `web/` deploys to Cloudflare Pages via the git integration on push to `main`.
- `packages/*` are never deployed — they're linked workspace-internal via pnpm.
