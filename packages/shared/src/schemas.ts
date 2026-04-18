import { z } from 'zod';
import { GRADES, VOTING_METHODS } from './types';

export const gradeSchema = z.enum(GRADES);
export const votingMethodSchema = z.enum(VOTING_METHODS);

export const candidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail: z.string(),
});

export const createBallotSchema = z.object({
  name: z.string().min(1),
  candidates: z.array(candidateSchema).min(2),
  officialMethod: votingMethodSchema.default('ivstar'),
});

export const updateBallotSchema = z.object({
  name: z.string().min(1),
  candidates: z.array(candidateSchema).min(2),
  active: z.boolean(),
  officialMethod: votingMethodSchema.default('ivstar'),
});

export const voteSchema = z.object({
  ballotId: z.number().int().positive(),
  voterName: z.string().min(1).max(100),
  sessionId: z.string().uuid(),
  ratings: z.record(z.string(), gradeSchema),
});
