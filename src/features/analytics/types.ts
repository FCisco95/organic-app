export type AnalyticsPreset = '7d' | '14d' | '30d' | '90d';

export const ANALYTICS_PRESETS: Record<
  AnalyticsPreset,
  { days: number; weeks: number; months: number }
> = {
  '7d': { days: 7, weeks: 1, months: 1 },
  '14d': { days: 14, weeks: 2, months: 2 },
  '30d': { days: 30, weeks: 4, months: 6 },
  '90d': { days: 90, weeks: 12, months: 12 },
};

export interface AnalyticsKPIs {
  total_users: number;
  org_holders: number;
  tasks_completed: number;
  active_proposals: number;
  org_price: number | null;
  market_cap: number | null;
}

export interface ProposalThroughput30d {
  created: number;
  finalized: number;
  passed: number;
}

export interface DisputeAggregate30d {
  opened: number;
  resolved: number;
  unresolved: number;
}

export interface VoteParticipation30d {
  eligible_voters: number;
  voters_cast: number;
  participation_rate: number;
}

export interface ActiveContributorSignals30d {
  active_members: number;
  task_submitters: number;
  commenters: number;
  voters: number;
}

export interface AnalyticsTrustMeta {
  proposal_throughput_30d: ProposalThroughput30d;
  dispute_aggregate_30d: DisputeAggregate30d;
  vote_participation_30d: VoteParticipation30d;
  active_contributor_signals_30d: ActiveContributorSignals30d;
  updated_at: string;
  refresh_interval_seconds: number;
}

export interface ActivityTrendPoint {
  day: string;
  task_events: number;
  governance_events: number;
  comment_events: number;
}

export interface MemberGrowthPoint {
  month: string;
  new_members: number;
  cumulative_members: number;
}

export interface TaskCompletionPoint {
  week: string;
  completed_count: number;
  total_points: number;
}

export interface ProposalCategoryData {
  category: string;
  count: number;
}

export interface VotingParticipationData {
  proposal_id: string;
  proposal_title: string;
  vote_count: number;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
}

export interface MarketData {
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume1h: number;
  volume24h: number;
  txns1h: { buys: number; sells: number };
  txns24h: { buys: number; sells: number };
  liquidity: number;
  marketCap: number | null;
  fdv: number | null;
  dex: string;
  pairAddress: string;
  fetchedAt: string;
}

export interface HolderTier {
  label: string;
  count: number;
  percentage: number;
  totalBalance: number;
  supplyPercentage: number;
}

export interface TopHolder {
  rank: number;
  address: string;
  balance: number;
  supplyPercentage: number;
}

export interface HolderDistribution {
  totalHolders: number;
  circulatingSupply: number;
  maxSupply: number;
  top10Concentration: number;
  top50Concentration: number;
  whaleCount: number;
  whaleConcentration: number;
  topHolders: TopHolder[];
  tiers: HolderTier[];
  medianBalance: number;
  averageBalance: number;
  fetchedAt: string;
}

export interface MarketAnalyticsData {
  market: MarketData | null;
  holders: HolderDistribution | null;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  activity_trends: ActivityTrendPoint[];
  member_growth: MemberGrowthPoint[];
  task_completions: TaskCompletionPoint[];
  proposals_by_category: ProposalCategoryData[];
  voting_participation: VotingParticipationData[];
  trust: AnalyticsTrustMeta;
}
