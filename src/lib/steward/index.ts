import { HeuristicSteward } from './heuristics';
import type { StewardClient } from './types';

export type {
  StewardClient,
  StewardReview,
  StewardScore,
  StewardRecommendation,
  BacklogTaskSnapshot,
} from './types';

export async function getStewardClient(): Promise<StewardClient> {
  const backend = process.env.STEWARD_BACKEND ?? 'heuristic';
  if (backend === 'llm') {
    const mod = await import('./llm');
    return new mod.LlmSteward();
  }
  return new HeuristicSteward();
}
