import { z } from 'zod';

export const analyticsKPIsSchema = z.object({
  total_users: z.number(),
  org_holders: z.number(),
  tasks_completed: z.number(),
  active_proposals: z.number(),
  org_price: z.number().nullable(),
  market_cap: z.number().nullable(),
});

export const activityTrendPointSchema = z.object({
  day: z.string(),
  task_events: z.number(),
  governance_events: z.number(),
  comment_events: z.number(),
});

export const memberGrowthPointSchema = z.object({
  month: z.string(),
  new_members: z.number(),
  cumulative_members: z.number(),
});

export const taskCompletionPointSchema = z.object({
  week: z.string(),
  completed_count: z.number(),
  total_points: z.number(),
});

export const proposalCategoryDataSchema = z.object({
  category: z.string(),
  count: z.number(),
});

export const votingParticipationDataSchema = z.object({
  proposal_id: z.string(),
  proposal_title: z.string(),
  vote_count: z.number(),
  yes_votes: z.number(),
  no_votes: z.number(),
  abstain_votes: z.number(),
});

export const proposalThroughput30dSchema = z.object({
  created: z.number(),
  finalized: z.number(),
  passed: z.number(),
});

export const disputeAggregate30dSchema = z.object({
  opened: z.number(),
  resolved: z.number(),
  unresolved: z.number(),
});

export const voteParticipation30dSchema = z.object({
  eligible_voters: z.number(),
  voters_cast: z.number(),
  participation_rate: z.number(),
});

export const activeContributorSignals30dSchema = z.object({
  active_members: z.number(),
  task_submitters: z.number(),
  commenters: z.number(),
  voters: z.number(),
});

export const analyticsTrustMetaSchema = z.object({
  proposal_throughput_30d: proposalThroughput30dSchema,
  dispute_aggregate_30d: disputeAggregate30dSchema,
  vote_participation_30d: voteParticipation30dSchema,
  active_contributor_signals_30d: activeContributorSignals30dSchema,
  updated_at: z.string(),
  refresh_interval_seconds: z.number(),
});

export const analyticsDataSchema = z.object({
  kpis: analyticsKPIsSchema,
  activity_trends: z.array(activityTrendPointSchema),
  member_growth: z.array(memberGrowthPointSchema),
  task_completions: z.array(taskCompletionPointSchema),
  proposals_by_category: z.array(proposalCategoryDataSchema),
  voting_participation: z.array(votingParticipationDataSchema),
  trust: analyticsTrustMetaSchema,
});
