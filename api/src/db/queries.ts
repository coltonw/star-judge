import type { Ballot, Candidate, Vote, Grade, Bindings } from './types'

function parseBallot(row: Record<string, unknown>): Ballot {
  return {
    id: row.id as number,
    name: row.name as string,
    candidates: JSON.parse(row.candidates as string) as Candidate[],
    active: (row.active as number) === 1,
    created_at: row.created_at as string,
  }
}

function parseVote(row: Record<string, unknown>): Vote {
  return {
    id: row.id as number,
    ballot_id: row.ballot_id as number,
    voter_name: row.voter_name as string,
    session_id: row.session_id as string,
    ratings: JSON.parse(row.ratings as string) as Record<string, Grade>,
    created_at: row.created_at as string,
  }
}

export async function getBallots(db: Bindings['DB']): Promise<Ballot[]> {
  const { results } = await db
    .prepare('SELECT * FROM ballots ORDER BY created_at DESC')
    .all()
  return results.map(parseBallot)
}

export async function getActiveBallot(db: Bindings['DB']): Promise<Ballot | null> {
  const row = await db
    .prepare('SELECT * FROM ballots WHERE active = 1 ORDER BY created_at DESC LIMIT 1')
    .first()
  return row ? parseBallot(row) : null
}

export async function getBallot(db: Bindings['DB'], id: number): Promise<Ballot | null> {
  const row = await db.prepare('SELECT * FROM ballots WHERE id = ?').bind(id).first()
  return row ? parseBallot(row) : null
}

export async function createBallot(
  db: Bindings['DB'],
  name: string,
  candidates: Candidate[]
): Promise<Ballot> {
  const result = await db
    .prepare('INSERT INTO ballots (name, candidates) VALUES (?, ?) RETURNING *')
    .bind(name, JSON.stringify(candidates))
    .first()
  return parseBallot(result!)
}

export async function updateBallot(
  db: Bindings['DB'],
  id: number,
  name: string,
  candidates: Candidate[],
  active: boolean
): Promise<Ballot | null> {
  const result = await db
    .prepare(
      'UPDATE ballots SET name = ?, candidates = ?, active = ? WHERE id = ? RETURNING *'
    )
    .bind(name, JSON.stringify(candidates), active ? 1 : 0, id)
    .first()
  return result ? parseBallot(result) : null
}

export async function deleteBallot(db: Bindings['DB'], id: number): Promise<void> {
  await db.prepare('DELETE FROM ballots WHERE id = ?').bind(id).run()
}

export async function getVotesForBallot(db: Bindings['DB'], ballotId: number): Promise<Vote[]> {
  const { results } = await db
    .prepare('SELECT * FROM votes WHERE ballot_id = ?')
    .bind(ballotId)
    .all()
  return results.map(parseVote)
}

export async function getVoteBySession(
  db: Bindings['DB'],
  ballotId: number,
  sessionId: string
): Promise<Vote | null> {
  const row = await db
    .prepare('SELECT * FROM votes WHERE ballot_id = ? AND session_id = ?')
    .bind(ballotId, sessionId)
    .first()
  return row ? parseVote(row) : null
}

export async function upsertVote(
  db: Bindings['DB'],
  ballotId: number,
  voterName: string,
  sessionId: string,
  ratings: Record<string, Grade>
): Promise<Vote> {
  const result = await db
    .prepare(
      `INSERT INTO votes (ballot_id, voter_name, session_id, ratings)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(ballot_id, session_id)
       DO UPDATE SET voter_name = excluded.voter_name, ratings = excluded.ratings
       RETURNING *`
    )
    .bind(ballotId, voterName, sessionId, JSON.stringify(ratings))
    .first()
  return parseVote(result!)
}
