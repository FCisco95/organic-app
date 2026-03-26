// ─── AI Governance Summary Types ─────────────────────────────────────────────

export interface GovernanceKeyMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

export interface GovernanceSummaryContent {
  headline: string;
  key_metrics: GovernanceKeyMetric[];
  insights: string[];
  risks: string[];
  sentiment: 'healthy' | 'caution' | 'critical';
}

export interface GovernanceSummary {
  id: string;
  content: GovernanceSummaryContent;
  summary_text: string;
  period_start: string;
  period_end: string;
  model_used: string;
  token_count: number;
  created_at: string;
}

/** Raw DAO metrics collected before feeding to the AI model. */
export interface DaoMetricsSnapshot {
  active_proposals: number;
  proposals_by_status: Record<string, number>;
  voting_participation_pct: number;
  voting_participation_prev_pct: number;
  tasks_completed_this_week: number;
  tasks_completed_last_week: number;
  treasury_balance_usd: number | null;
  new_members_this_week: number;
  total_members: number;
  top_xp_earners: { name: string; xp: number }[];
  flagged_items: number;
  disputes_open: number;
}
