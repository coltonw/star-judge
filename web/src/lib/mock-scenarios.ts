import type { Candidate, Grade, TallyResponse, Vote, VotingMethodKey } from '@star-judge/shared';
import { buildTally } from '@star-judge/voting';

// Resolves a BGG game id to the R2 public URL used by the rest of the app.
// Empty string if no base is configured (falls back to text-only tiles).
const BGG_IMG_BASE = import.meta.env.VITE_BGG_IMAGES_BASE ?? '';
const thumb = (bggId: string): string => (BGG_IMG_BASE ? `${BGG_IMG_BASE}/bgg/${bggId}.jpg` : '');

// ─── Public shape (unchanged) ────────────────────────────────────────────────
export interface MockScenario {
  id: string;
  label: string;
  description: string;
  tally: TallyResponse;
  related?: { id: string; label: string };
}

// ─── Internal definition ─────────────────────────────────────────────────────
interface ScenarioDef {
  id: string;
  label: string;
  description: string;
  ballotName: string;
  officialMethod: VotingMethodKey;
  candidates: Candidate[];
  ballots: BallotDef[];
  related?: { id: string; label: string };
}

interface BallotDef {
  voter: string;
  ratings: Record<string, Grade>;
}

// ─── Vote-block helpers ──────────────────────────────────────────────────────
// Build N ballots that share the same ratings, with auto-numbered voter names.
function block(n: number, namePrefix: string, ratings: Record<string, Grade>): BallotDef[] {
  return Array.from({ length: n }, (_, i) => ({ voter: `${namePrefix} ${i + 1}`, ratings }));
}
function ballot(voter: string, ratings: Record<string, Grade>): BallotDef {
  return { voter, ratings };
}

// Realize a BallotDef as a Vote (only voter_name + ratings are used by rankers).
let _seq = 0;
function realize(b: BallotDef): Vote {
  _seq++;
  return {
    id: _seq,
    ballot_id: 0,
    voter_name: b.voter,
    session_id: `mock-${_seq}`,
    ratings: b.ratings,
    created_at: '',
  };
}

// ─── Candidates shared across scenarios ──────────────────────────────────────
const C = {
  harmonies: { id: 'harmonies', name: 'Harmonies', thumbnail: thumb('414317') },
  catan: { id: 'catan', name: 'Catan', thumbnail: thumb('13') },
  pandemic: { id: 'pandemic', name: 'Pandemic', thumbnail: thumb('30549') },
  codenames: { id: 'codenames', name: 'Codenames', thumbnail: thumb('178900') },
  ttr: { id: 'ttr', name: 'Ticket to Ride', thumbnail: thumb('9209') },
  ra: { id: 'ra', name: 'Ra', thumbnail: thumb('12') },
  terra: { id: 'terra', name: 'Terra Mystica', thumbnail: thumb('120677') },
  cosmic: { id: 'cosmic', name: 'Cosmic Encounter', thumbnail: thumb('39463') },
  powergrid: { id: 'powergrid', name: 'Power Grid', thumbnail: thumb('2651') },
  barrage: { id: 'barrage', name: 'Barrage', thumbnail: thumb('251247') },
  brass: { id: 'brass', name: 'Brass Birmingham', thumbnail: thumb('224517') },
  dom: { id: 'dom', name: 'Dominion', thumbnail: thumb('36218') },
  odin: { id: 'odin', name: 'A Feast for Odin', thumbnail: thumb('177736') },
  tokaido: { id: 'tokaido', name: 'Tokaido', thumbnail: thumb('123540') },
  spirit: { id: 'spirit', name: 'Spirit Island', thumbnail: thumb('162886') },
  crew: { id: 'crew', name: 'The Crew: Mission Deep Sea', thumbnail: thumb('324856') },
  forbidden: { id: 'forbidden', name: 'Forbidden Island', thumbnail: thumb('65244') },
  mem: { id: 'mem', name: 'Memphis', thumbnail: '' },
  nash: { id: 'nash', name: 'Nashville', thumbnail: '' },
  chat: { id: 'chat', name: 'Chattanooga', thumbnail: '' },
  knox: { id: 'knox', name: 'Knoxville', thumbnail: '' },
} as const;

// ─── Scenario definitions ────────────────────────────────────────────────────

// Methods Disagree: same ballot, divergent winners. MJ picks Catan (polarizer
// with median=E). STAR/Borda/IRV/Condorcet pick Pandemic (the consistent
// crowd-pleaser — Pandemic ties at top with two ambivalent voters and wins
// the runoff). Dictator (Sam) picks Catan.
const diverge: ScenarioDef = {
  id: 'mock-diverge',
  label: 'Methods Disagree',
  description:
    'Same ballot, different winners — proof that the method you choose can pick the game you play. STAR/Borda/IRV/Condorcet pick the consistent Pandemic; Dictator picks the polarizer Catan.',
  ballotName: 'Game Night — Methods Compared',
  officialMethod: 'ivstar',
  candidates: [C.catan, C.pandemic, C.harmonies, C.codenames, C.ttr],
  ballots: [
    ballot('Catan-strict-1', {
      catan: 'excellent',
      pandemic: 'verygood',
      harmonies: 'verygood',
      codenames: 'good',
      ttr: 'fair',
    }),
    ...block(2, 'Catan-Pandemic-equal', {
      catan: 'excellent',
      pandemic: 'excellent',
      harmonies: 'verygood',
      codenames: 'good',
      ttr: 'fair',
    }),
    ...block(3, 'Pandemic-fan', {
      pandemic: 'excellent',
      harmonies: 'verygood',
      codenames: 'good',
      ttr: 'average',
      catan: 'poor',
    }),
    ballot('Sam', { catan: 'excellent', pandemic: 'verygood', harmonies: 'verygood', codenames: 'good', ttr: 'fair' }),
  ],
};

// Methods Agree: everyone loves Harmonies — all eight methods agree.
const agree: ScenarioDef = {
  id: 'mock-agree',
  label: 'Methods Agree',
  description: 'The baseline case: when voters agree, all eight methods agree. Everyone loves Harmonies.',
  ballotName: 'Easy Night In',
  officialMethod: 'ivstar',
  candidates: [C.harmonies, C.codenames, C.ra],
  ballots: [
    ...block(3, 'Fan', { harmonies: 'excellent', codenames: 'verygood', ra: 'good' }),
    ballot('Casual', { harmonies: 'excellent', codenames: 'good', ra: 'average' }),
    ballot('Pat', { harmonies: 'verygood', codenames: 'excellent', ra: 'verygood' }),
  ],
};

// Borda's Broad-Support Winner: euro-vs-epic polarization, Codenames is the
// calm second choice that Borda + Condorcet lift to #1. STAR/MJ/IRV still pick
// the polarizing favorite. Sam votes last, dictator picks Codenames.
const bordaConsensus: ScenarioDef = {
  id: 'mock-borda-consensus',
  label: 'Broad Support Wins',
  description:
    'STAR/MJ/IRV pick the polarizing favorite. Borda and Condorcet lift the consensus runner-up — the game nobody hates.',
  ballotName: 'Euros vs Epics',
  officialMethod: 'borda',
  candidates: [C.catan, C.codenames, C.barrage],
  ballots: [
    ...block(3, 'Euro-fan', { catan: 'excellent', codenames: 'fair', barrage: 'poor' }),
    ...block(3, 'Epic-fan', { barrage: 'excellent', codenames: 'fair', catan: 'poor' }),
    ballot('Sam', { codenames: 'excellent', catan: 'verygood', barrage: 'poor' }),
  ],
};

// No Votes Yet: degenerate case, all rankings empty.
const noVotes: ScenarioDef = {
  id: 'mock-novotes',
  label: 'No Votes Yet',
  description: 'The ballot is open but nobody has voted yet.',
  ballotName: 'Friday Night Games',
  officialMethod: 'ivstar',
  candidates: [C.harmonies, C.catan, C.codenames],
  ballots: [],
};

// Perfect Tie: Catan and Pandemic share identical aggregate grades. Most voters
// rate them equally; one voter prefers Pandemic, Jordan (the dictator) prefers
// Catan, and the two asymmetries cancel out so the aggregate tallies stay tied.
// Every method deadlocks at #1 except Dictator.
const tie: ScenarioDef = {
  id: 'mock-tie',
  label: 'Perfect Tie',
  description: 'Two games have identical ratings — every method deadlocks at #1 except Dictator.',
  ballotName: 'Impossible to Choose',
  officialMethod: 'ivstar',
  candidates: [C.catan, C.pandemic, C.harmonies],
  ballots: [
    ...block(2, 'High', { catan: 'excellent', pandemic: 'excellent', harmonies: 'average' }),
    ...block(2, 'Mid', { catan: 'verygood', pandemic: 'verygood', harmonies: 'average' }),
    ballot('Casual', { catan: 'good', pandemic: 'good', harmonies: 'verygood' }),
    ballot('Counter', { catan: 'good', pandemic: 'excellent', harmonies: 'good' }),
    ballot('Jordan', { catan: 'excellent', pandemic: 'good', harmonies: 'good' }),
  ],
};

// STAR Runoff Flip: Cosmic scores highest but Terra wins the head-to-head
// runoff 5-2. IRV + Condorcet also pick Terra. IV vetoes Terra (2 HP). Dictator
// Jordan is a Cosmic-fan.
const runoffFlip: ScenarioDef = {
  id: 'mock-runoff-flip',
  label: 'STAR Runoff Flip',
  description: 'The highest-scoring game loses the runoff — majority preferred the runner-up head-to-head.',
  ballotName: 'STAR Runoff Demo',
  officialMethod: 'star',
  candidates: [C.cosmic, C.terra, C.powergrid],
  ballots: [
    ...block(5, 'Eurogamer', { terra: 'verygood', cosmic: 'good', powergrid: 'good' }),
    ballot('HP-1', { cosmic: 'excellent', terra: 'poor', powergrid: 'average' }),
    ballot('Jordan', { cosmic: 'excellent', terra: 'poor', powergrid: 'average' }),
  ],
};

// Single Vote: only one voter (Riley); every method just reflects their ratings.
const oneVote: ScenarioDef = {
  id: 'mock-onevote',
  label: 'Single Vote',
  description: "Only one voter so far — rankings are just that person's ratings.",
  ballotName: 'Just Me So Far',
  officialMethod: 'ivstar',
  candidates: [C.harmonies, C.catan, C.codenames],
  ballots: [ballot('Riley', { harmonies: 'excellent', catan: 'good', codenames: 'fair' })],
};

// Veto — No Effect: every game has the same minimum Hard Pass count, so the
// IV methods fall through. Sam votes last, dictator picks Catan.
const vetoNodiff: ScenarioDef = {
  id: 'mock-veto-nodiff',
  label: 'Veto — No Effect',
  description:
    "Veto isn't a trump card — when every game has the same Hard Pass count, the IV methods fall through and the raw winners stand.",
  ballotName: 'Equal Hard Passes',
  officialMethod: 'ivmj',
  candidates: [C.harmonies, C.catan, C.ra],
  ballots: [
    ballot('HP-Harm', { harmonies: 'poor', catan: 'verygood', ra: 'good' }),
    ballot('HP-Catan', { harmonies: 'excellent', catan: 'poor', ra: 'good' }),
    ballot('HP-Ra', { harmonies: 'excellent', catan: 'verygood', ra: 'poor' }),
    ballot('Mid', { harmonies: 'excellent', catan: 'verygood', ra: 'average' }),
    ballot('Sam', { harmonies: 'verygood', catan: 'verygood', ra: 'average' }),
  ],
};

// Veto — One Survivor: Catan & Pandemic both pile up Hard Passes; Harmonies
// (no HPs) is the only survivor, winning both IV methods by default.
const vetoOneSurvivor: ScenarioDef = {
  id: 'mock-veto-onesurvivor',
  label: 'Veto — One Survivor',
  description: 'Only one game escapes the veto — it wins both IV methods by default.',
  ballotName: 'Mass Disqualification',
  officialMethod: 'ivstar',
  candidates: [C.catan, C.pandemic, C.harmonies],
  ballots: [
    ...block(2, 'Catan-fan', { catan: 'excellent', pandemic: 'poor', harmonies: 'verygood' }),
    ...block(2, 'Pandemic-fan', { pandemic: 'excellent', catan: 'poor', harmonies: 'verygood' }),
    ballot('Pandemic-fan 3', { pandemic: 'excellent', catan: 'excellent', harmonies: 'excellent' }),
    ballot('Alex', { catan: 'excellent', pandemic: 'poor', harmonies: 'verygood' }),
  ],
};

// Veto — Changes Winner: Catan has the highest score but one Hard Pass.
// The veto knocks Catan out; Harmonies wins IV. Sam (Catan-fan) votes last.
const vetoChangesWinner: ScenarioDef = {
  id: 'mock-veto-changes-winner',
  label: 'Veto — Changes Winner',
  description: 'The top-rated game has one Hard Pass — the veto knocks it out and the runner-up wins.',
  ballotName: 'One Dissenting Vote',
  officialMethod: 'ivstar',
  candidates: [C.catan, C.harmonies, C.ra],
  ballots: [
    ...block(3, 'Catan-fan', { catan: 'excellent', harmonies: 'verygood', ra: 'good' }),
    ballot('HP-Catan', { catan: 'poor', harmonies: 'verygood', ra: 'good' }),
    ballot('Sam', { catan: 'excellent', harmonies: 'verygood', ra: 'good' }),
  ],
};

// Maximum Disagreement: five different winners across the eight methods.
// MJ→Ra (median=E polarizer); STAR/Borda/IRV/Condorcet→Brass; IV·STAR→Dominion;
// IV·MJ→Catan; Dictator→Odin (Sam loves it, everyone else HPs).
const maxDisagree: ScenarioDef = {
  id: 'mock-max-disagree',
  label: 'Maximum Disagreement',
  description: 'Five different winners across eight methods — polarizer, consensus, vetoes, and a dictator finale.',
  ballotName: 'Five-Way Split',
  officialMethod: 'ivstar',
  candidates: [C.brass, C.ra, C.catan, C.dom, C.odin],
  ballots: [
    ...block(2, 'Brass-fan-A', { brass: 'excellent', ra: 'excellent', catan: 'good', dom: 'good', odin: 'poor' }),
    ballot('Brass-fan-B', { brass: 'excellent', ra: 'excellent', catan: 'verygood', dom: 'verygood', odin: 'poor' }),
    ballot('Dom-fan-A', { brass: 'verygood', ra: 'excellent', catan: 'verygood', dom: 'excellent', odin: 'poor' }),
    ballot('Dom-fan-B', { brass: 'verygood', ra: 'poor', catan: 'verygood', dom: 'excellent', odin: 'poor' }),
    ballot('Catan-HP-Brass', { brass: 'poor', ra: 'poor', catan: 'verygood', dom: 'good', odin: 'poor' }),
    ballot('Sam', { brass: 'verygood', ra: 'poor', catan: 'good', dom: 'good', odin: 'excellent' }),
  ],
};

// Condorcet Paradox (asymmetric): Ra > Brass > Catan > Ra — a genuine cycle.
// MJ/Borda pick Brass; STAR/IRV pick Ra; Dictator (Morgan, lone Catan-fan) picks Catan.
const condorcetCycle: ScenarioDef = {
  id: 'mock-condorcet-cycle',
  label: 'Condorcet Cycle',
  description: 'Ra>Brass>Catan>Ra — a real cycle with different grades per candidate, not just a perfect tie.',
  ballotName: 'Rock Paper Scissors',
  officialMethod: 'condorcet',
  candidates: [C.ra, C.brass, C.catan],
  ballots: [
    ...block(3, 'Group-A', { ra: 'excellent', brass: 'verygood', catan: 'average' }),
    ...block(3, 'Group-B', { brass: 'excellent', catan: 'verygood', ra: 'good' }),
    ballot('Morgan', { catan: 'excellent', ra: 'verygood', brass: 'good' }),
  ],
};

// Tennessee Capital (Condorcet vs IRV): canonical political-science example.
// Memphis has plurality but loses every head-to-head. Nashville is the Condorcet
// winner. IRV picks Knoxville. Implicit Veto knocks out Memphis AND Knoxville.
// Dictator (Kyle) is a Knoxville fan.
const tennessee: ScenarioDef = {
  id: 'mock-tennessee',
  label: 'Tennessee Capital',
  description: 'Memphis has plurality but Nashville wins everything else — except IRV, which picks Knoxville.',
  ballotName: 'Tennessee Board Game Championship',
  officialMethod: 'condorcet',
  candidates: [C.mem, C.nash, C.chat, C.knox],
  ballots: [
    ...block(8, 'Memphis-fan', { mem: 'excellent', nash: 'verygood', chat: 'good', knox: 'poor' }),
    ...block(5, 'Nashville-fan', { nash: 'excellent', chat: 'verygood', knox: 'good', mem: 'poor' }),
    ...block(3, 'Chattanooga-fan', { chat: 'excellent', knox: 'verygood', nash: 'good', mem: 'poor' }),
    ...block(3, 'Knoxville-fan', { knox: 'excellent', chat: 'verygood', nash: 'good', mem: 'poor' }),
    ballot('Kyle', { knox: 'excellent', chat: 'verygood', nash: 'good', mem: 'poor' }),
  ],
};

// IRV Non-Monotonicity — Baseline: Harmonies wins every method, including IRV.
// Vote layout is the classic 17-voter non-monotonicity construction (Tideman):
// brass-fans rank brass > catan > harm (so catan absorbs their transfer if brass
// is eliminated, NOT harm). Catan eliminated first, transfers to harm. Harm wins.
// Companion scenario raises Harmonies in two ballots and IRV flips.
const irvSincere: ScenarioDef = {
  id: 'mock-irv-sincere',
  label: 'IRV — Baseline',
  description:
    'IRV picks Harmonies; MJ confirms it. Its companion scenario raises Harmonies on two ballots — and IRV kicks Harmonies out.',
  related: { id: 'mock-irv-raised', label: 'IRV — Raising Backfires' },
  ballotName: 'Board Game Showdown — Baseline Ballots',
  officialMethod: 'irv',
  candidates: [C.harmonies, C.brass, C.catan],
  ballots: [
    ...block(6, 'Harmonies-fan', { harmonies: 'excellent', brass: 'good', catan: 'fair' }),
    ...block(5, 'Brass-then-Catan', { brass: 'excellent', catan: 'verygood', harmonies: 'fair' }),
    ...block(5, 'Catan-then-Harmonies', { catan: 'excellent', harmonies: 'verygood', brass: 'fair' }),
    ballot('Morgan', { brass: 'excellent', catan: 'verygood', harmonies: 'fair' }),
  ],
};

// IRV Non-Monotonicity — Raised: Morgan and one peer flip brass>catan>harm to
// harm>brass>catan (raising Harmonies to #1). Score-based methods still pick
// Harmonies. But IRV now eliminates Brass first; brass voters' #2 is catan, so
// the transfer lifts Catan to a majority. Raising Harmonies caused Harmonies to
// lose — classic non-monotonicity.
const irvRaised: ScenarioDef = {
  id: 'mock-irv-raised',
  label: 'IRV — Raising Backfires',
  description:
    'Two voters raise Harmonies from #3 to #1. Score-based methods still pick Harmonies — its scores actually rise — but IRV eliminates Brass first, the transfers flow to Catan, and Catan wins. Raising a candidate caused them to lose.',
  related: { id: 'mock-irv-sincere', label: 'IRV — Baseline' },
  ballotName: 'Board Game Showdown — Harmonies Raised',
  officialMethod: 'irv',
  candidates: [C.harmonies, C.brass, C.catan],
  ballots: [
    ...block(6, 'Harmonies-fan', { harmonies: 'excellent', brass: 'good', catan: 'fair' }),
    ...block(4, 'Brass-then-Catan', { brass: 'excellent', catan: 'verygood', harmonies: 'fair' }),
    ballot('Raised-1', { harmonies: 'excellent', brass: 'verygood', catan: 'fair' }),
    ...block(5, 'Catan-then-Harmonies', { catan: 'excellent', harmonies: 'verygood', brass: 'fair' }),
    ballot('Morgan', { harmonies: 'excellent', brass: 'verygood', catan: 'fair' }),
  ],
};

// Compromise Wins: two factions pick polarizing favorites; a third backs the
// compromise everyone else tolerates. Seven methods lift the compromise.
// IRV alone eliminates it (fewest first-place votes) and then deadlocks
// the polarizers. Dictator (Riley) is a Codenames-fan.
const compromiseWins: ScenarioDef = {
  id: 'mock-compromise-wins',
  label: 'Compromise Wins',
  description:
    'Two factions pick polarizing favorites; a third picks the game everyone tolerates. Seven methods lift the compromise. IRV alone eliminates it and then deadlocks on the polarizers.',
  ballotName: 'Heavy vs Light vs Everyone-Likes-It',
  officialMethod: 'star',
  candidates: [C.barrage, C.codenames, C.catan],
  ballots: [
    ...block(4, 'Barrage-fan', { barrage: 'excellent', codenames: 'verygood', catan: 'poor' }),
    ...block(4, 'Catan-fan', { catan: 'excellent', codenames: 'verygood', barrage: 'poor' }),
    ...block(2, 'CN-fan', { codenames: 'excellent', barrage: 'good', catan: 'good' }),
    ballot('Riley', { codenames: 'excellent', barrage: 'good', catan: 'good' }),
  ],
};

// Borda Burying — Honest: Codenames is the broad-consensus compromise.
// Codenames wins STAR/Borda/Condorcet/IV·STAR; MJ and IRV still pick Brass.
// Honest baseline for bordaStrategic.
const bordaHonest: ScenarioDef = {
  id: 'mock-borda-honest',
  label: 'Borda Burying — Honest',
  description:
    "Codenames is the broad consensus — five voters' second choice. STAR, Borda, Condorcet, and IV·STAR all crown it. MJ and IRV still pick Brass on first-place strength. Honest baseline for the strategic companion.",
  related: { id: 'mock-borda-strategic', label: 'Borda Burying — Strategic' },
  ballotName: 'Honest Ballots',
  officialMethod: 'borda',
  candidates: [C.brass, C.codenames, C.catan],
  ballots: [
    ...block(5, 'Brass-fan', { brass: 'excellent', codenames: 'verygood', catan: 'good' }),
    ...block(4, 'Catan-fan', { catan: 'excellent', codenames: 'verygood', brass: 'good' }),
    ...block(2, 'CN-fan', { codenames: 'excellent', brass: 'verygood', catan: 'good' }),
  ],
};

// Borda Burying — Strategic: Brass-fans bury Codenames as Poor. STAR succeeds
// (Brass flips to #1). Borda backfires — burying drops Codenames below Catan
// on their ballots, handing Borda to Catan. Condorcet becomes a cycle.
const bordaStrategic: ScenarioDef = {
  id: 'mock-borda-strategic',
  label: 'Borda Burying — Strategic',
  description:
    'Brass-fans strategically bury Codenames at Poor. STAR strategy succeeds — Brass flips to #1. Borda backfires: burying demotes Codenames below Catan and hands Borda to Catan. Condorcet becomes a cycle.',
  related: { id: 'mock-borda-honest', label: 'Borda Burying — Honest' },
  ballotName: 'Brass-Fans Bury the Compromise',
  officialMethod: 'borda',
  candidates: [C.brass, C.codenames, C.catan],
  ballots: [
    ...block(5, 'Brass-fan-strategic', { brass: 'excellent', codenames: 'poor', catan: 'fair' }),
    ...block(4, 'Catan-fan', { catan: 'excellent', codenames: 'verygood', brass: 'good' }),
    ...block(2, 'CN-fan', { codenames: 'excellent', brass: 'verygood', catan: 'good' }),
  ],
};

// Borda Teaming — Before: small slate. Brass wins everything; Pandemic solid
// second. Codenames hard-passed by everyone. Companion scenario adds clones
// and Borda flips.
const teamingBefore: ScenarioDef = {
  id: 'mock-borda-teaming-before',
  label: 'Borda Teaming — Before',
  description:
    'Brass is the obvious winner — it sweeps every method, with Pandemic a solid second. Its companion scenario adds three more co-ops to the slate, and Borda alone flips to Pandemic.',
  related: { id: 'mock-borda-teaming-after', label: 'Borda Teaming — After' },
  ballotName: 'Small Slate',
  officialMethod: 'borda',
  candidates: [C.brass, C.pandemic, C.codenames],
  ballots: [
    ...block(7, 'Brass-fan', { brass: 'excellent', pandemic: 'good', codenames: 'poor' }),
    ...block(4, 'Pandemic-fan', { pandemic: 'excellent', brass: 'good', codenames: 'poor' }),
    ballot('Morgan', { pandemic: 'excellent', brass: 'good', codenames: 'poor' }),
  ],
};

// Borda Teaming — After: same 12 voters; Pandemic-fans nominate three more
// co-ops they love. Brass-fans rank clones low, brass high; Pandemic-fans
// rank clones just under Pandemic. With 6 candidates, Borda's rank-based
// math hands Pandemic the win. All other methods still pick Brass.
const teamingAfter: ScenarioDef = {
  id: 'mock-borda-teaming-after',
  label: 'Borda Teaming — After',
  description:
    'Pandemic-fans nominate three co-op clones (Spirit Island, Forbidden Island, The Crew). Borda alone flips to Pandemic — rank-based points reward broad mid-pack placement. Every other method still picks Brass.',
  related: { id: 'mock-borda-teaming-before', label: 'Borda Teaming — Before' },
  ballotName: 'Cloned Slate',
  officialMethod: 'borda',
  candidates: [C.brass, C.pandemic, C.codenames, C.spirit, C.forbidden, C.crew],
  ballots: [
    ...block(7, 'Brass-fan', {
      brass: 'excellent',
      pandemic: 'fair',
      codenames: 'poor',
      spirit: 'fair',
      forbidden: 'fair',
      crew: 'poor',
    }),
    ...block(4, 'Pandemic-fan', {
      pandemic: 'excellent',
      spirit: 'verygood',
      forbidden: 'verygood',
      crew: 'verygood',
      brass: 'good',
      codenames: 'poor',
    }),
    ballot('Morgan', {
      pandemic: 'excellent',
      spirit: 'verygood',
      forbidden: 'verygood',
      crew: 'verygood',
      brass: 'good',
      codenames: 'poor',
    }),
  ],
};

// STAR Bullet Voting — Honest: Pandemic has the highest score (wins MJ) but
// STAR's runoff is rank-based — Brass beats Pandemic head-to-head, so STAR
// picks Brass despite the lower score. Companion shows what happens when the
// Brass-fans bullet-vote.
const starBulletHonest: ScenarioDef = {
  id: 'mock-star-bullet-honest',
  label: 'STAR Bullet Voting — Honest',
  description:
    'Pandemic has the highest score (wins MJ). But STAR’s runoff is rank-based: Brass-fans + Catan-fans both prefer Brass over Pandemic head-to-head, and Brass wins STAR.',
  related: { id: 'mock-star-bullet-strategic', label: 'STAR Bullet Voting — Strategic' },
  ballotName: 'Heavy-Game Faction Votes Honestly',
  officialMethod: 'star',
  candidates: [C.brass, C.pandemic, C.catan],
  ballots: [
    ...block(5, 'Brass-fan', { brass: 'excellent', pandemic: 'verygood', catan: 'poor' }),
    ...block(3, 'Pandemic-fan', { pandemic: 'excellent', catan: 'good', brass: 'poor' }),
    ...block(2, 'Catan-fan', { catan: 'excellent', brass: 'good', pandemic: 'average' }),
    ballot('Sam', { catan: 'excellent', brass: 'good', pandemic: 'average' }),
  ],
};

// STAR Bullet Voting — Strategic: Brass-fans bullet-vote Brass=E, Pandemic=P,
// Catan=P. Pandemic's score collapses; the new runoff is Brass vs Catan, and
// Pandemic-fans (who now equally hate Brass and Catan) lean Catan. The
// Brass-fans' strategy elected their LEAST-favorite game.
const starBulletStrategic: ScenarioDef = {
  id: 'mock-star-bullet-strategic',
  label: 'STAR Bullet Voting — Strategic',
  description:
    'Brass-fans bullet-vote, burying both rivals at Poor. Pandemic falls out of the runoff — but the new Brass vs Catan runoff hands the win to Catan, the Brass-fans’ least-favorite game.',
  related: { id: 'mock-star-bullet-honest', label: 'STAR Bullet Voting — Honest' },
  ballotName: 'Heavy-Game Faction Bullet-Votes',
  officialMethod: 'star',
  candidates: [C.brass, C.pandemic, C.catan],
  ballots: [
    ...block(5, 'Brass-fan-bullet', { brass: 'excellent', pandemic: 'poor', catan: 'poor' }),
    ...block(3, 'Pandemic-fan', { pandemic: 'excellent', catan: 'good', brass: 'poor' }),
    ...block(2, 'Catan-fan', { catan: 'excellent', brass: 'good', pandemic: 'average' }),
    ballot('Sam', { catan: 'excellent', brass: 'good', pandemic: 'average' }),
  ],
};

// DH3 — Dark Horse Pathology: three factions all bury each other's favorites.
// Tokaido, the bland fourth, is everyone's second choice and slips through.
// Six of eight methods crown Tokaido. IRV is the lone survivor.
const darkHorse3: ScenarioDef = {
  id: 'mock-dh3',
  label: 'Dark Horse Pathology',
  description:
    "Three factions bury each other's favorites — and elect a game nobody actually wanted. Tokaido is everyone's second choice and nobody's first; six of eight methods crown it. IRV is the lone survivor.",
  ballotName: 'Three Factions, One Dark Horse',
  officialMethod: 'borda',
  candidates: [C.brass, C.pandemic, C.catan, C.tokaido],
  ballots: [
    ...block(4, 'Brass-fan', { brass: 'excellent', pandemic: 'poor', catan: 'poor', tokaido: 'good' }),
    ...block(3, 'Pandemic-fan', { pandemic: 'excellent', brass: 'poor', catan: 'poor', tokaido: 'good' }),
    ...block(3, 'Catan-fan', { catan: 'excellent', brass: 'poor', pandemic: 'poor', tokaido: 'good' }),
    ballot('Jordan', { catan: 'excellent', brass: 'poor', pandemic: 'poor', tokaido: 'good' }),
  ],
};

// ─── Public ordering ─────────────────────────────────────────────────────────
const PUBLIC_DEFS: ScenarioDef[] = [
  diverge,
  tennessee,
  condorcetCycle,
  runoffFlip,
  bordaConsensus,
  maxDisagree,
  vetoChangesWinner,
  vetoNodiff,
  irvSincere,
  irvRaised,
  compromiseWins,
  bordaHonest,
  bordaStrategic,
  teamingBefore,
  teamingAfter,
  starBulletHonest,
  starBulletStrategic,
  darkHorse3,
  tie,
  agree,
];

// Admin-only scenarios. Empty/degenerate-state fixtures plus scenarios whose
// voting-theory payoff is too thin for the public showcase.
const ADMIN_DEFS: ScenarioDef[] = [oneVote, noVotes, vetoOneSurvivor];

// ─── Realization ─────────────────────────────────────────────────────────────
// Tallies are computed once at module load. The cost is small (eight rankers
// over ~15 votes each, ~20 scenarios) and pays off as identity stability:
// getMockScenario(id) returns the same object on every call, which the tally
// page's reactivity needs.
function realizeScenario(def: ScenarioDef): MockScenario {
  _seq = 0;
  const votes = def.ballots.map(realize);
  const tally = buildTally(
    { ballotId: 0, ballotName: def.ballotName, officialMethod: def.officialMethod },
    def.candidates as Candidate[],
    votes
  );
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    tally,
    ...(def.related && { related: def.related }),
  };
}

export const MOCK_SCENARIOS: MockScenario[] = PUBLIC_DEFS.map(realizeScenario);
export const ADMIN_MOCK_SCENARIOS: MockScenario[] = ADMIN_DEFS.map(realizeScenario);
export const ALL_MOCK_SCENARIOS: MockScenario[] = [...MOCK_SCENARIOS, ...ADMIN_MOCK_SCENARIOS];

export function getMockScenario(id: string): MockScenario | undefined {
  return ALL_MOCK_SCENARIOS.find((s) => s.id === id);
}
