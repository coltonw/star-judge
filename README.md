# Star Judge

**A board game voting app that runs every vote through eight different election methods simultaneously** — so you can see exactly where the methods agree, where they fight, and occasionally witness the full chaos of a Condorcet paradox on a Tuesday night.

Built for recurring board game nights where "what should we play?" somehow always takes 20 minutes. Now it takes 20 minutes *and* produces a beautiful chart.

---

## What it does

Players rate each candidate game on a six-point scale (Hyped → Hard Pass). One set of ratings, eight simultaneous verdicts:

| Method | What it optimizes for |
|--------|----------------------|
| **STAR Voting** | Score phase picks top 2; runoff picks who more voters preferred |
| **IV · STAR** | STAR, but games with too many Hard Passes are disqualified first |
| **Majority Judgment** | Median grade wins; tie-broken by how strongly the group leans |
| **IV · MJ** | MJ after vetoing games with disproportionate Hard Passes |
| **Borda Count** | Points by rank; rewards consistent support over peak enthusiasm |
| **Instant Runoff (IRV)** | Eliminates last place each round; redistributes votes |
| **Condorcet** | Every game vs. every game head-to-head; the one who beats all wins — unless there's a cycle 🔄 |
| **Dictator** | Democracy is cancelled. The last person to vote picks everything |

The tally page shows all eight results in real time (polls every 5 seconds), highlights where they agree, and lets you designate one method as the "official" result via the admin panel.

---

## Why this is interesting

You probably only know one voting method — whichever one your country or group happens to use. Star Judge runs eight at once, so every ballot doubles as a ringside seat on how different election systems answer the same question (and how often they disagree).

The tool works for picking a board game. The fun part is watching the methods fight.

**Load up the mock scenarios** to see edge cases that would be impossible to manufacture in real life:

- **Methods Disagree** — MJ picks the polarizing crowd-splitter; STAR picks the consistent crowd-pleaser
- **STAR Runoff Flip** — the highest-scoring game *loses* the runoff because most voters preferred the runner-up head-to-head
- **All Four Disagree** — constructed so MJ, STAR, IV·MJ, and IV·STAR each pick a different winner
- **Condorcet Cycle** — Azul > Brass > Catan > Azul; a genuine rock-paper-scissors deadlock where MJ, STAR, Borda, and IRV still disagree on who should win the tiebreak
- **Tennessee Capital** — the classic political science example: Memphis has plurality (40%) but *loses every single head-to-head*. Nashville is the Condorcet winner. IRV somehow picks Knoxville. Memphis and Knoxville both get vetoed.

The `/methods` page has a plain-English explainer for each method alongside the scenario it handles differently.

---

## Stack

```
Cloudflare Pages (SvelteKit 5 + Runes)
       │  fetch('/api/...')
       ▼
Cloudflare Workers (Hono)
       │  D1 SQL
       ▼
Cloudflare D1 (SQLite)
```

- **Frontend**: SvelteKit 5 with Svelte Runes (`$state`, `$derived`, `$effect`). Animated stacked bar charts in pure CSS — no chart library.
- **Backend**: [Hono](https://hono.dev/) on Cloudflare Workers. Fast, typed, zero cold starts.
- **Database**: Cloudflare D1 (SQLite at the edge).
- **Admin auth**: Cloudflare Access — Google/GitHub OAuth with zero auth code. The login UI is entirely managed by Cloudflare.
- **Voter identity**: UUID in `localStorage` — honor-system double-vote prevention with a 409 on conflict.
- **Linting**: [Biome](https://biomejs.dev/) with experimental Svelte support.

---

## Local development

```bash
# Install dependencies
pnpm install

# Start API (Hono Worker via Wrangler)
pnpm dev:api

# Start frontend (SvelteKit)
pnpm dev:web
```

Copy `api/.dev.vars.example` to `api/.dev.vars` and fill in your D1 database ID. Run the schema migration:

```bash
pnpm --filter api db:migrate:local
```

---

## Project layout

```
star-judge/
├── packages/
│   ├── voting/        # @star-judge/voting — the 8 methods, pure TS, zero CF deps
│   │   └── src/
│   │       ├── star.ts           # STAR + runoff
│   │       ├── majority-judgment.ts
│   │       ├── implicit-veto.ts  # IV·STAR and IV·MJ
│   │       ├── borda.ts
│   │       ├── irv.ts            # exact rational arithmetic
│   │       ├── condorcet.ts      # Copeland + paradox detection
│   │       ├── dictator.ts
│   │       └── shared/           # buildGradeCounts, pairwiseWinner
│   └── shared/        # @star-judge/shared — types + Zod schemas
│       └── src/
│           ├── types.ts          # Candidate, Ballot, Grade, TallyResponse
│           └── schemas.ts        # Zod schemas used by api + web
│
├── api/               # Hono Cloudflare Worker
│   └── src/
│       ├── index.ts              # app entrypoint + request-id middleware
│       ├── routes/               # ballots, votes, tally, bgg
│       ├── middleware/           # request-id, admin auth
│       └── db/                   # schema.sql, queries.ts
│
└── web/               # SvelteKit 5 frontend
    └── src/
        ├── routes/
        │   ├── +page.svelte              # Home — active ballot + scenarios
        │   ├── methods/+page.svelte      # Educational: 8 methods explained
        │   ├── vote/[id]/+page.svelte    # Rating form
        │   ├── tally/[id]/+page.svelte   # Results (live + mock)
        │   └── admin/                    # Ballot management
        └── lib/
            ├── methods.ts                # METHOD_INFO — single source of truth
            ├── consensus.ts              # winner / tiebreaker derivation
            ├── mock-scenarios.ts         # hand-crafted canned tallies
            └── components/
                ├── MethodCard.svelte
                ├── TallyChart.svelte     # animated stacked bars
                └── GamePicker.svelte     # BGG collection picker
```

---

## Deployment

```bash
# Deploy the Hono Worker
pnpm --filter api deploy

# Frontend deploys automatically via Cloudflare Pages on push to main
```

Set these Worker secrets:

```bash
wrangler secret put BGG_API_KEY
wrangler secret put CLOUDFLARE_ACCESS_AUD
```

Configure Cloudflare Access in Zero Trust dashboard for `/admin/*`.

---

## CI

GitHub Actions runs on every push and PR:

1. **Biome** — lint and format check across all TypeScript and Svelte files
2. **svelte-check** — full SvelteKit type checking
3. **tsc** — Hono Worker type checking
4. **Deploy** — pushes to `main` automatically deploy the Worker (Pages deploys itself)

Secrets needed: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
