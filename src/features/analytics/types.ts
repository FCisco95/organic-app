export interface AnalyticsKPIs {
  total_users: number;
  org_holders: number;
  tasks_completed: number;
  active_proposals: number;
  org_price: number | null;
  market_cap: number | null;
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

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  activity_trends: ActivityTrendPoint[];
  member_growth: MemberGrowthPoint[];
  task_completions: TaskCompletionPoint[];
  proposals_by_category: ProposalCategoryData[];
  voting_participation: VotingParticipationData[];
}
