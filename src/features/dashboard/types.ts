export interface SprintAiSummary {
  text: string;
  themes: string[];
  generatedAt: string | null;
  model: string | null;
}

export interface SprintHero {
  id: string;
  name: string;
  status: string | null;
  startAt: string;
  endAt: string;
  disputeWindowEndsAt: string | null;
  goal: string | null;
  progress: { done: number; total: number; pointsTotal: number; pointsDone: number };
  topContributors: TopContributor[];
  aiSummary: SprintAiSummary | null;
}

export interface TopContributor {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  organicId: number | null;
  xpEarned: number;
}

export interface DashboardStatStrip {
  activeMembers24h: number;
  pointsDistributedThisSprint: number;
  tasksShippedThisSprint: number;
  openProposals: number;
}

export interface MyContributions {
  tasksDone: number;
  pointsEarned: number;
  xpEarned: number;
  nextTaskHref: string | null;
}

export interface ActivityDigestEntry {
  id: string;
  eventType: string;
  actorName: string | null;
  actorOrganicId: number | null;
  actorAvatarUrl: string | null;
  subjectType: string;
  subjectId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

import type { TenantBranding } from '@/lib/tenant/types';

export interface DashboardPayload {
  branding: TenantBranding;
  sprint: SprintHero | null;
  stats: DashboardStatStrip;
  myContributions: MyContributions | null;
  activityDigest: ActivityDigestEntry[];
}

export interface PresencePayload {
  activeCount: number;
  lastActivityAt: string | null;
}
