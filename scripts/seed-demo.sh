#!/usr/bin/env bash
# Seed a contrived demo ballot that produces different winners for MJ and STAR.
#
# MJ winner:   Catan      (Excellent median — polarizing love/hate game)
# STAR winner: Pandemic   (highest score pool; beats Wingspan in runoff)
#
# Run against a local wrangler dev server:
#   bash scripts/seed-demo.sh
# Or against a deployed worker:
#   BASE=https://your-worker.workers.dev bash scripts/seed-demo.sh

set -e
BASE="${BASE:-http://localhost:8787}"

echo "→ Seeding demo ballot at $BASE"

# ── Create the ballot ────────────────────────────────────────────────────────
BALLOT=$(curl -sf -X POST "$BASE/api/admin/ballots" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Game Night — Methods Compared",
    "candidates": [
      {"id":"catan",     "name":"Catan",          "thumbnail":""},
      {"id":"ttr",       "name":"Ticket to Ride",  "thumbnail":""},
      {"id":"pandemic",  "name":"Pandemic",         "thumbnail":""},
      {"id":"codenames", "name":"Codenames",        "thumbnail":""},
      {"id":"wingspan",  "name":"Wingspan",         "thumbnail":""}
    ]
  }')

BALLOT_ID=$(echo "$BALLOT" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "   Created ballot #$BALLOT_ID"

# ── Helper to cast a vote ────────────────────────────────────────────────────
cast() {
  local NAME="$1" SESSION="$2" RATINGS="$3"
  curl -sf -X POST "$BASE/api/votes" \
    -H 'Content-Type: application/json' \
    -d "{\"ballotId\":$BALLOT_ID,\"voterName\":\"$NAME\",\"sessionId\":\"$SESSION\",\"ratings\":$RATINGS}" \
    > /dev/null
  echo "   Vote cast: $NAME"
}

# ── 7 carefully crafted voters ───────────────────────────────────────────────
# Catan:     4 excellent + 3 poor     → MJ median = Excellent, STAR score = 20
# TtR:       4 good     + 3 average   → MJ median = Good,      STAR score = 18
# Pandemic:  7 verygood               → MJ median = Very Good, STAR score = 28  ← STAR wins
# Codenames: 4 verygood + 3 good      → MJ median = Very Good, STAR score = 25
# Wingspan:  1 excellent+4 vg+2 good  → MJ median = Very Good, STAR score = 27

# UUIDs must satisfy RFC 4122: version nibble [1-8], variant nibble [89ab]
cast "Alice"   "00000001-0000-4000-8000-000000000001" \
  '{"catan":"excellent","ttr":"good","pandemic":"verygood","codenames":"verygood","wingspan":"excellent"}'

cast "Bob"     "00000002-0000-4000-8000-000000000002" \
  '{"catan":"excellent","ttr":"good","pandemic":"verygood","codenames":"verygood","wingspan":"verygood"}'

cast "Carol"   "00000003-0000-4000-8000-000000000003" \
  '{"catan":"excellent","ttr":"good","pandemic":"verygood","codenames":"good","wingspan":"verygood"}'

cast "Dave"    "00000004-0000-4000-8000-000000000004" \
  '{"catan":"excellent","ttr":"good","pandemic":"verygood","codenames":"good","wingspan":"verygood"}'

cast "Eve"     "00000005-0000-4000-8000-000000000005" \
  '{"catan":"poor","ttr":"average","pandemic":"verygood","codenames":"verygood","wingspan":"verygood"}'

cast "Frank"   "00000006-0000-4000-8000-000000000006" \
  '{"catan":"poor","ttr":"average","pandemic":"verygood","codenames":"verygood","wingspan":"good"}'

cast "Grace"   "00000007-0000-4000-8000-000000000007" \
  '{"catan":"poor","ttr":"average","pandemic":"verygood","codenames":"good","wingspan":"good"}'

# ── Verify ───────────────────────────────────────────────────────────────────
TALLY=$(curl -sf "$BASE/api/tally/$BALLOT_ID")
MJ_WINNER=$(echo "$TALLY" | grep -o '"mj":\[{"id":"[^"]*","name":"[^"]*"' | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
STAR_WINNER=$(echo "$TALLY" | grep -o '"star":\[{"id":"[^"]*","name":"[^"]*"' | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "✓ Done! View at: $BASE/../tally/$BALLOT_ID (web on :5173)"
echo "  MJ winner:   $MJ_WINNER"
echo "  STAR winner: $STAR_WINNER"
if [ "$MJ_WINNER" != "$STAR_WINNER" ]; then
  echo "  ✓ Methods disagree — divergence confirmed!"
else
  echo "  ✗ Methods agree (unexpected)"
fi
