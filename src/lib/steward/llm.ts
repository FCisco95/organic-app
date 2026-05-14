import { HeuristicSteward } from './heuristics';
import type { StewardClient, StewardReview } from './types';

// Stub for D1b — replaced by Anthropic-backed implementation in Task 10.
// Currently delegates to the heuristic so STEWARD_BACKEND=llm is safe to set
// during the rollout window before D1b lands.
export class LlmSteward implements StewardClient {
  private readonly fallback = new HeuristicSteward();

  suggestN(orgId: string | null): Promise<number> {
    return this.fallback.suggestN(orgId);
  }

  reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]> {
    return this.fallback.reviewBacklogCandidates(taskIds);
  }
}
