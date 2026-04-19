import type { VotingMethodKey } from '@star-judge/shared';

export type MethodMode = 'star' | 'mj' | 'borda' | 'irv' | 'condorcet' | 'dictator';
export type MethodVariant = 'default' | 'iv' | 'dictator';

export interface MethodInfo {
  key: VotingMethodKey;
  label: string;
  // One-liner — fits on a card
  tagline: string;
  // Plain-English explainer used on /methods and in info popovers
  summary: string;
  // How it decides ties / edge cases
  tiebreak?: string;
  // One pathological or revealing scenario this method handles differently
  scenario?: {
    scenarioId: string;
    title: string;
    blurb: string;
  };
  wikiUrl?: string;
  // GitHub path to the implementation — link points at packages/voting
  sourceFile: string;
  // Short description rendered inline on the tally page method card
  cardDescription: string;
  // Chart rendering mode
  mode: MethodMode;
  // Visual variant for MethodCard styling
  variant?: MethodVariant;
}

export const METHOD_INFO: Record<VotingMethodKey, MethodInfo> = {
  mj: {
    key: 'mj',
    label: 'Majority Judgment',
    tagline: "Each game's median grade wins.",
    summary:
      'Every voter grades every game independently. The game with the highest median grade wins. MJ is known for resisting strategic voting — a single lone voter trying to push an outlier has almost no effect on the median.',
    tiebreak:
      'Ties are broken by the Balinski–Laraki distance: how many votes would need to move before the median changes. The median that is "further from the cliff" wins.',
    scenario: {
      scenarioId: 'mock-diverge',
      title: 'Polarizing winner',
      blurb:
        'Catan gets 4 "excellent" and 3 "hard pass" — its median is "excellent" so MJ picks it, even though most methods pick the crowd-pleaser.',
    },
    wikiUrl: 'https://en.wikipedia.org/wiki/Majority_judgment',
    sourceFile: 'packages/voting/src/majority-judgment.ts',
    cardDescription:
      "Each game's median grade wins. Ties broken by how resilient that median is to being moved — resistant to strategic voting.",
    mode: 'mj',
  },
  ivmj: {
    key: 'ivmj',
    label: 'IV · Majority Judgment',
    tagline: 'Veto first, then MJ ranks the survivors.',
    summary:
      'Same idea as IV·STAR, but the survivors run through Majority Judgment instead of STAR. Games with disproportionate "hard pass" votes are disqualified first; then the median-grade winner is picked from what remains.',
    scenario: {
      scenarioId: 'mock-veto-changes-winner',
      title: 'A veto flips the winner',
      blurb: "MJ's winner gets vetoed — IV·MJ promotes the runner-up instead.",
    },
    sourceFile: 'packages/voting/src/implicit-veto.ts',
    cardDescription: 'Same veto rule as IV·STAR — survivors run through Majority Judgment instead of STAR.',
    mode: 'mj',
    variant: 'iv',
  },
  star: {
    key: 'star',
    label: 'STAR Voting',
    tagline: 'Score phase picks two finalists; runoff picks the winner.',
    summary:
      "Each voter scores every game 0–5 (via the grade labels). The two highest-scoring games advance to a runoff. In the runoff, each voter's ballot goes to whichever finalist they rated higher; the majority wins.",
    tiebreak:
      'Ties for 2nd place are broken by pairwise head-to-head among the tied candidates. A three-way tie in the runoff falls back to Copeland scoring.',
    scenario: {
      scenarioId: 'mock-runoff-flip',
      title: 'Runoff flips the score winner',
      blurb:
        'One game wins the score phase but loses head-to-head in the runoff — classic STAR behavior that pure score-based methods miss.',
    },
    wikiUrl: 'https://en.wikipedia.org/wiki/STAR_voting',
    sourceFile: 'packages/voting/src/star.ts',
    cardDescription:
      'Highest average score picks the top 2 finalists. Ties for 2nd are broken by pairwise head-to-head. Those two go head-to-head: whoever more voters rated higher wins the runoff.',
    mode: 'star',
  },
  ivstar: {
    key: 'ivstar',
    label: 'IV · STAR Voting',
    tagline: 'Veto first, then STAR scores + runoff.',
    summary:
      'Every game that collected more "hard pass" votes than the least-vetoed game is disqualified first. The survivors then run through normal STAR (score phase picks two finalists, runoff picks the winner). A good middle ground between "crowd-pleaser wins" and "nobody is stuck playing something they hate."',
    scenario: {
      scenarioId: 'mock-veto-changes-winner',
      title: 'A veto flips the winner',
      blurb: 'The un-vetoed STAR runner-up takes the win.',
    },
    sourceFile: 'packages/voting/src/implicit-veto.ts',
    cardDescription:
      'Games with more Hard Passes than the least-vetoed game are disqualified first, then STAR ranks the survivors.',
    mode: 'star',
    variant: 'iv',
  },
  borda: {
    key: 'borda',
    label: 'Borda Count',
    tagline: 'Rank-based points, top of ballot scores highest.',
    summary:
      'Each voter ranks the games. The top of a ballot is worth N−1 points, second place N−2, and so on. Games with tied grades on the same ballot split the points evenly. Highest total points wins.',
    scenario: {
      scenarioId: 'mock-borda-consensus',
      title: 'Rewards broad support',
      blurb: 'Borda favors the game most often ranked near the top — even if it rarely finishes first.',
    },
    wikiUrl: 'https://en.wikipedia.org/wiki/Borda_count',
    sourceFile: 'packages/voting/src/borda.ts',
    cardDescription:
      'Each voter ranks all games. Points are awarded by rank (top = N−1 pts, bottom = 0 pts). Tied grades split the points evenly. Highest total wins.',
    mode: 'borda',
  },
  irv: {
    key: 'irv',
    label: 'Instant Runoff (IRV)',
    tagline: 'Eliminate last place each round until someone has a majority.',
    summary:
      "Each voter's top remaining choice gets their vote each round. The game with the fewest first-place votes is eliminated, and its voters' next preferences redistribute. Repeat until one game crosses 50%. Used in Australia and some US elections.",
    tiebreak:
      'Vote splits are tracked in exact rational arithmetic (scaled by LCM of 1..N) so multiple tied favorites on one ballot never cause float-precision rank flips.',
    scenario: {
      scenarioId: 'mock-tennessee',
      title: 'Tennessee capital',
      blurb:
        "The classic textbook scenario: Memphis wins IRV despite most voters preferring Nashville overall. Clear demonstration of IRV's 'center-squeeze' flaw.",
    },
    wikiUrl: 'https://en.wikipedia.org/wiki/Instant-runoff_voting',
    sourceFile: 'packages/voting/src/irv.ts',
    cardDescription:
      "Voters' top remaining choice gets their vote each round. The last-place game is eliminated and votes redistribute — until one game holds a majority.",
    mode: 'irv',
  },
  condorcet: {
    key: 'condorcet',
    label: 'Condorcet',
    tagline: 'Whoever beats every other game in head-to-head wins.',
    summary:
      'Every pair of games is scored head-to-head by counting how many voters ranked one higher than the other. If one game beats every other in these pairwise matches, it wins. When there is no such "Condorcet winner," we fall back to Copeland scoring (most pairwise wins).',
    tiebreak:
      'If the pairwise comparisons form a rock-paper-scissors cycle (A beats B, B beats C, C beats A), the tally surfaces a "paradox" banner — the result is genuinely tied.',
    scenario: {
      scenarioId: 'mock-condorcet-cycle',
      title: 'Rock-paper-scissors',
      blurb: 'A, B, and C form a cycle — no winner exists, and the paradox banner says so.',
    },
    wikiUrl: 'https://en.wikipedia.org/wiki/Condorcet_method',
    sourceFile: 'packages/voting/src/condorcet.ts',
    cardDescription:
      "Every game fights every other game head-to-head. The game that beats all others wins. If there's a rock-paper-scissors cycle… nobody wins. 🔄",
    mode: 'condorcet',
  },
  dictator: {
    key: 'dictator',
    label: 'Dictator',
    tagline: 'The last voter picks everything. Democracy is cancelled.',
    summary:
      'One voter (the most recent to submit a vote) decides the outcome. Included as a control: it is trivially strategic, ignores every other voter, and is the baseline against which every other method looks good.',
    scenario: {
      scenarioId: 'mock-onevote',
      title: 'One voter, no debate',
      blurb: 'When one person votes, they are by definition the dictator.',
    },
    sourceFile: 'packages/voting/src/dictator.ts',
    cardDescription:
      'Democracy is cancelled. The last person to vote picks everything. Bars show what everyone wanted — ranking shows what the dictator gets.',
    mode: 'dictator',
    variant: 'dictator',
  },
};

export const METHOD_ORDER: VotingMethodKey[] = [
  'star',
  'ivstar',
  'mj',
  'ivmj',
  'borda',
  'irv',
  'condorcet',
  'dictator',
];

export function methodInfo(key: VotingMethodKey): MethodInfo {
  return METHOD_INFO[key];
}

// Tally-page pair layout. Each pair renders side-by-side. Pairs can be
// reordered by officialMethod to promote the highlighted method to the top.
export const METHOD_PAIRS: [VotingMethodKey, VotingMethodKey][] = [
  ['star', 'ivstar'],
  ['mj', 'ivmj'],
  ['borda', 'irv'],
  ['condorcet', 'dictator'],
];

// Returns METHOD_PAIRS with the pair containing `official` moved to the front.
// Other pairs preserve their relative order.
export function orderedPairs(official: VotingMethodKey): [VotingMethodKey, VotingMethodKey][] {
  const idx = METHOD_PAIRS.findIndex((p) => p[0] === official || p[1] === official);
  if (idx <= 0) return METHOD_PAIRS;
  return [METHOD_PAIRS[idx], ...METHOD_PAIRS.slice(0, idx), ...METHOD_PAIRS.slice(idx + 1)];
}

// GitHub tree URL base — keep in sync with repo URL. Used to link method source.
export const REPO_TREE_BASE = 'https://github.com/coltonw/star-judge/blob/main/';
