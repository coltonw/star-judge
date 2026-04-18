import type { VotingMethodKey } from '@star-judge/shared';

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
  },
  ivmj: {
    key: 'ivmj',
    label: 'IV · Majority Judgment',
    tagline: 'Veto first, then MJ ranks the survivors.',
    summary:
      'Games with more "hard pass" votes than the least-vetoed game are disqualified first. Whatever survives then runs through normal Majority Judgment. This prevents a polarizing game from winning when a sizeable minority refuses to play it.',
    scenario: {
      scenarioId: 'mock-veto-changes-winner',
      title: 'A veto flips the winner',
      blurb: "MJ's winner gets vetoed — IV·MJ promotes the runner-up instead.",
    },
    sourceFile: 'packages/voting/src/implicit-veto.ts',
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
  },
  ivstar: {
    key: 'ivstar',
    label: 'IV · STAR Voting',
    tagline: 'Veto first, then STAR scores + runoff.',
    summary:
      'Same idea as IV·MJ: remove every game that collected more "hard pass" votes than the least-vetoed game, then run normal STAR on the survivors. Good middle ground between "crowd-pleaser" and "nobody is stuck playing something they hate."',
    scenario: {
      scenarioId: 'mock-veto-changes-winner',
      title: 'A veto flips the winner',
      blurb: 'The un-vetoed STAR runner-up takes the win.',
    },
    sourceFile: 'packages/voting/src/implicit-veto.ts',
  },
  borda: {
    key: 'borda',
    label: 'Borda Count',
    tagline: 'Rank-based points, top of ballot scores highest.',
    summary:
      'Each voter ranks the games. The top of a ballot is worth N−1 points, second place N−2, and so on. Games with tied grades on the same ballot split the points evenly. Highest total points wins.',
    scenario: {
      scenarioId: 'mock-runoff-flip',
      title: 'Rewards broad support',
      blurb: 'Borda favors the game most often ranked near the top — even if it rarely finishes first.',
    },
    wikiUrl: 'https://en.wikipedia.org/wiki/Borda_count',
    sourceFile: 'packages/voting/src/borda.ts',
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

// GitHub tree URL base — keep in sync with repo URL. Used to link method source.
export const REPO_TREE_BASE = 'https://github.com/coltonw/star-judge/blob/main/';
