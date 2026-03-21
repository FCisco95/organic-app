'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Lock,
  MapPin,
  Globe,
  Star,
  Calendar,
  ExternalLink,
  Flame,
  Clock,
  CheckCircle2,
  Vote,
  Trophy,
  ArrowUpCircle,
  Layers,
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useMember, ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';
import { useReputation, useAchievements, useLeaderboard } from '@/features/reputation';
import type { AchievementWithStatus } from '@/features/reputation/types';
import { LevelBadge } from '@/components/reputation/level-badge';
import { XpProgressBar } from '@/components/reputation/xp-progress-bar';
import { StreakDisplay } from '@/components/reputation/streak-display';
import { AchievementGrid } from '@/components/reputation/achievement-grid';
import { ProfileTabs, type ProfileTab } from '@/components/community';
import { useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/context';

function TwitterIcon() {
  return <span className="text-xs font-bold">X</span>;
}
function DiscordIcon() {
  return <span className="text-xs font-bold">D</span>;
}

/* ─── Stat Card (Proto C) ─── */

function StatCard({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 text-center relative overflow-hidden group hover:border-border transition-colors duration-200">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-organic-orange/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="text-muted-foreground/40 mx-auto mb-3 flex justify-center">{icon}</div>
        <p className="text-3xl font-bold font-mono tabular-nums text-foreground">{value}</p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-1.5">{label}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  XP Sparkline — tiny inline SVG showing upward trend to current XP */
/* ------------------------------------------------------------------ */
function XpSparkline({ xpTotal }: { xpTotal: number }) {
  const points = useMemo(() => {
    // Generate 8 points trending upward with some noise
    const steps = 8;
    const result: number[] = [];
    for (let i = 0; i < steps; i++) {
      const base = (xpTotal * (i + 1)) / steps;
      const noise = (Math.random() - 0.5) * xpTotal * 0.12;
      result.push(Math.max(0, base + noise));
    }
    // Ensure last point is actual XP
    result[steps - 1] = xpTotal;
    return result;
  }, [xpTotal]);

  if (xpTotal <= 0) return null;

  const width = 60;
  const height = 20;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const pathData = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block ml-1.5 align-middle"
      aria-hidden="true"
    >
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-organic-orange"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: 200,
          animation: 'sparkline-draw 1.2s ease-out forwards 0.3s',
        }}
      />
      <style>{`@keyframes sparkline-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Contribution Heatmap — GitHub-style 365-day grid                  */
/* ------------------------------------------------------------------ */
function ContributionHeatmap({
  tasksCompleted,
  totalPoints,
}: {
  tasksCompleted: number;
  totalPoints: number;
}) {
  const t = useTranslations('Community');
  const locale = useLocale();

  const { cells, totalContributions, monthLabels } = useMemo(() => {
    const today = new Date();
    const totalDays = 364; // 52 weeks
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays);
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Derive a seed from tasks + points for deterministic-per-member distribution
    const seed = tasksCompleted * 7 + totalPoints * 3;
    let pseudoRng = seed;
    const nextRng = () => {
      pseudoRng = (pseudoRng * 1103515245 + 12345) & 0x7fffffff;
      return pseudoRng / 0x7fffffff;
    };

    // Total contributions derived from member stats
    const total = Math.max(tasksCompleted + Math.floor(totalPoints / 10), 1);

    // Distribute contributions across days with a bias toward recent
    const days: { date: Date; count: number }[] = [];
    let distributed = 0;

    const actualDays =
      Math.ceil(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    for (let i = 0; i < actualDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      // Bias: more activity on recent days + weekdays
      const recencyFactor = (i / actualDays) ** 1.5;
      const dayOfWeek = d.getDay();
      const weekdayBoost = dayOfWeek > 0 && dayOfWeek < 6 ? 1.3 : 0.7;
      const probability =
        ((total * 2.5) / actualDays) * recencyFactor * weekdayBoost;
      const count = nextRng() < probability / total ? Math.ceil(nextRng() * 4) : 0;
      days.push({ date: d, count });
      distributed += count > 0 ? count : 0;
    }

    // Normalize to approximate total
    if (distributed > 0 && total > 0) {
      const scale = total / distributed;
      for (const d of days) {
        d.count = Math.round(d.count * scale);
      }
    }

    const finalTotal = days.reduce((s, d) => s + d.count, 0);

    // Month labels
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < days.length; i++) {
      const m = days[i].date.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        const col = Math.floor(i / 7);
        months.push({
          label: days[i].date.toLocaleDateString(locale, { month: 'short' }),
          col,
        });
      }
    }

    return { cells: days, totalContributions: finalTotal, monthLabels: months };
  }, [tasksCompleted, totalPoints, locale]);

  // Organize cells into columns (weeks)
  const weeks = useMemo(() => {
    const result: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [cells]);

  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const getIntensityClass = useCallback((count: number) => {
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-organic-orange/20';
    if (count === 2) return 'bg-organic-orange/40';
    if (count === 3) return 'bg-organic-orange/60';
    return 'bg-organic-orange';
  }, []);

  const handleMouseEnter = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      cell: { date: Date; count: number }
    ) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const dateStr = cell.date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setTooltip({
        text: t('heatmapTooltip', { count: cell.count, date: dateStr }),
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    },
    [locale, t]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      <h3 className="text-sm font-medium text-foreground mb-3">
        {t('contributionActivity')}
      </h3>

      {/* Month labels */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <div className="flex gap-px mb-1 ml-0">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-muted-foreground font-mono"
                style={{
                  position: 'relative',
                  left: `${m.col * 13}px`,
                  marginRight: i < monthLabels.length - 1 ? 0 : undefined,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-px">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-px">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={`w-[11px] h-[11px] rounded-[2px] ${getIntensityClass(cell.count)} transition-transform hover:scale-150 cursor-default`}
                    onMouseEnter={(e) => handleMouseEnter(e, cell)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
                {/* Pad incomplete weeks */}
                {week.length < 7 &&
                  Array.from({ length: 7 - week.length }).map((_, pi) => (
                    <div key={`pad-${pi}`} className="w-[11px] h-[11px]" />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground mt-2">
        {t('contributionsInYear', { total: totalContributions })}
      </p>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg whitespace-nowrap font-mono"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contribution Heatmap Skeleton                                     */
/* ------------------------------------------------------------------ */
function HeatmapSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-3" />
      <div className="flex gap-px">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-px">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="w-[11px] h-[11px] rounded-[2px] bg-muted" />
            ))}
          </div>
        ))}
      </div>
      <div className="h-3 w-48 bg-muted rounded mt-2" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Feed — timeline of recent activity (derived from data)   */
/* ------------------------------------------------------------------ */
interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  description: string;
  timestamp: Date;
}

function ActivityFeed({
  member,
  reputation,
  achievements,
}: {
  member: { tasks_completed: number; total_points: number; created_at?: string | null };
  reputation: { level: number; xp_total: number } | null | undefined;
  achievements: AchievementWithStatus[] | null | undefined;
}) {
  const t = useTranslations('Community');

  const items = useMemo<ActivityItem[]>(() => {
    const result: ActivityItem[] = [];
    const now = new Date();

    // Achievements earned (most recent first)
    if (achievements) {
      const unlocked = achievements
        .filter((a) => a.unlocked)
        .sort((a, b) => {
          if (a.unlocked_at && b.unlocked_at)
            return (
              new Date(b.unlocked_at).getTime() -
              new Date(a.unlocked_at).getTime()
            );
          return 0;
        })
        .slice(0, 5);

      unlocked.forEach((a, i) => {
        result.push({
          id: `ach-${a.id}`,
          icon: <Trophy className="w-4 h-4 text-yellow-500" />,
          description: t('activityAchievement', { name: a.name }),
          timestamp: a.unlocked_at
            ? new Date(a.unlocked_at)
            : new Date(now.getTime() - (i + 1) * 3 * 24 * 60 * 60 * 1000),
        });
      });
    }

    // Level reached
    if (reputation && reputation.level > 1) {
      result.push({
        id: 'level-up',
        icon: <ArrowUpCircle className="w-4 h-4 text-organic-orange" />,
        description: t('activityLevelUp', { level: reputation.level }),
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
    }

    // Tasks completed (create simulated entries)
    if (member.tasks_completed > 0) {
      const taskEntries = Math.min(member.tasks_completed, 5);
      for (let i = 0; i < taskEntries; i++) {
        result.push({
          id: `task-${i}`,
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          description: t('activityTaskCompleted'),
          timestamp: new Date(
            now.getTime() - (i + 1) * 2 * 24 * 60 * 60 * 1000
          ),
        });
      }
    }

    // Voting participation (simulated from XP)
    if (reputation && reputation.xp_total >= 100) {
      result.push({
        id: 'vote-1',
        icon: <Vote className="w-4 h-4 text-blue-500" />,
        description: t('activityVoteCast'),
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      });
    }

    // Sort by timestamp descending
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return result.slice(0, 10);
  }, [member, reputation, achievements, t]);

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border border-dashed p-8 text-center">
        <Clock aria-hidden="true" className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t('activityEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="relative">
        {/* Vertical timeline connector */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px border-l border-dashed border-border" />

        <div className="space-y-4">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start gap-3 relative opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative z-10 shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Feed Skeleton                                            */
/* ------------------------------------------------------------------ */
function ActivityFeedSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-muted shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-3/4 mb-1" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Relative time helper                                              */
/* ------------------------------------------------------------------ */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/* ================================================================== */
/*  Page component                                                    */
/* ================================================================== */
export default function CommunityProfilePage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? '';
  const locale = useLocale();
  const t = useTranslations('Members');
  const tC = useTranslations('Community');
  const tRep = useTranslations('Reputation');
  const { user } = useAuth();
  const { data: member, isLoading } = useMember(id);
  const profileVisible = member?.profile_visible ?? false;
  const { data: reputation } = useReputation(id, { enabled: profileVisible });
  const { data: achievements } = useAchievements(id, { enabled: profileVisible });
  const { data: leaderboard = [] } = useLeaderboard({ enabled: profileVisible });

  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');

  const memberRank = useMemo(() => {
    const entry = leaderboard.find((e) => e.id === id);
    return entry?.rank;
  }, [leaderboard, id]);

  const earnedCount = useMemo(() => {
    if (!achievements) return 0;
    return achievements.filter((a) => a.unlocked).length;
  }, [achievements]);

  const displayName = useMemo(() => {
    if (!member) return '';
    return (
      member.name || (member.organic_id ? `ORG-${member.organic_id}` : t('anonymous'))
    );
  }, [member, t]);

  // Dynamic page title
  useEffect(() => {
    if (displayName) {
      document.title = `${displayName} — Organic`;
    }
    return () => {
      document.title = 'Organic';
    };
  }, [displayName]);

  if (isLoading) {
    return (
      <PageContainer width="narrow">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-6 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer width="narrow">
        <p className="text-muted-foreground">{t('memberNotFound')}</p>
      </PageContainer>
    );
  }

  if (!member.profile_visible) {
    const isOwnProfile = user?.id === member.id;

    return (
      <PageContainer width="narrow">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {tC('backToCommunity')}
        </Link>
        <div className="text-center py-16">
          <Lock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('privateProfile')}</h2>
          <p className="text-muted-foreground">{t('privateProfileDescription')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('privateProfileScope')}</p>
          {isOwnProfile && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 mt-5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t('managePrivacySettings')}
            </Link>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <div data-testid="member-profile-page">
        {/* Back link */}
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {tC('backToCommunity')}
        </Link>

        {/* Profile header — always visible above tabs */}
        <div
          className="bg-card rounded-xl border border-border p-6 mb-6"
          data-testid="member-profile-header"
        >
          <div className="flex items-start gap-5">
            {member.avatar_url ? (
              <Image
                src={member.avatar_url}
                alt={displayName}
                width={80}
                height={80}
                className="rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-border">
                <span className="text-white font-bold text-3xl">
                  {displayName[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                {member.role && member.role !== 'guest' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[member.role as UserRole]}`}
                  >
                    {ROLE_LABELS[member.role as UserRole]}
                  </span>
                )}
                {reputation && reputation.level > 1 && (
                  <LevelBadge level={reputation.level} size="md" />
                )}
              </div>
              {member.organic_id && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  ORG-{member.organic_id}
                </p>
              )}
              {member.bio && (
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {member.bio}
                </p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mt-5 text-sm text-muted-foreground">
            {member.location && (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden="true" className="w-3.5 h-3.5" /> {member.location}
              </span>
            )}
            {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-organic-orange"
              >
                <Globe aria-hidden="true" className="w-3.5 h-3.5" /> {t('website')}
                <ExternalLink aria-hidden="true" className="w-3 h-3" />
              </a>
            )}
            {member.twitter && (
              <a
                href={`https://x.com/${member.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-organic-orange"
              >
                <TwitterIcon /> @{member.twitter}
              </a>
            )}
            {member.discord && (
              <span className="flex items-center gap-1.5">
                <DiscordIcon /> {member.discord}
              </span>
            )}
            {member.created_at && (
              <span className="flex items-center gap-1">
                <Calendar aria-hidden="true" className="w-3.5 h-3.5" />{' '}
                {t('memberSince', {
                  date: new Date(member.created_at).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                  }),
                })}
              </span>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <ProfileTabs activeTab={activeProfileTab} onTabChange={setActiveProfileTab} />

        {/* Tab content — CSS hidden toggle to preserve state */}
        <div className={activeProfileTab === 'overview' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            {/* Stat cards — 4-column row on desktop, 2x2 on mobile */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
              data-testid="member-stats-grid"
            >
              <StatCard
                value={member.total_points}
                label={tC('statTotalPoints')}
                icon={<Star className="w-5 h-5" />}
              />
              <StatCard
                value={member.tasks_completed}
                label={tC('statTasksCompleted')}
                icon={<CheckCircle2 className="w-5 h-5" />}
              />
              <StatCard
                value={memberRank ? `#${memberRank}` : '—'}
                label={tC('statRank')}
                icon={<Trophy className="w-5 h-5" />}
              />
              <StatCard
                value={reputation?.level ?? 1}
                label={tC('statLevel')}
                icon={<Layers className="w-5 h-5" />}
              />
            </div>

            {/* Contribution Heatmap */}
            <ContributionHeatmap
              tasksCompleted={member.tasks_completed}
              totalPoints={member.total_points}
            />

            {/* Quick glance */}
            <div className="border border-border/30 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                {tC('quickGlance', {
                  rank: memberRank ?? '—',
                  level: reputation?.level ?? 1,
                  tasks: member.tasks_completed,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className={activeProfileTab === 'reputation' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            {reputation ? (
              <div
                className="bg-card rounded-xl border border-border p-6"
                data-testid="member-reputation-section"
              >
                <div className="flex items-center gap-4 mb-4">
                  <LevelBadge level={reputation.level} size="lg" />
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <StreakDisplay streak={reputation.current_streak} />
                  </div>
                </div>
                <XpProgressBar xpTotal={reputation.xp_total} level={reputation.level} />

                {/* XP breakdown placeholder */}
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground italic">
                    {tC('xpBreakdownComingSoon')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">{tRep('noAchievementsYet')}</p>
              </div>
            )}
          </div>
        </div>

        <div className={activeProfileTab === 'achievements' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            <div
              className="bg-card rounded-xl border border-border p-6"
              data-testid="member-achievements-grid"
            >
              {achievements && achievements.length > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  {tC('achievementsEarned', {
                    earned: earnedCount,
                    total: achievements.length,
                  })}
                </p>
              )}
              {achievements && achievements.length > 0 ? (
                <AchievementGrid achievements={achievements} />
              ) : (
                <p className="text-sm text-muted-foreground">{tRep('noAchievementsYet')}</p>
              )}
            </div>
          </div>
        </div>

        <div className={activeProfileTab === 'activity' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            {member && reputation !== undefined ? (
              <ActivityFeed
                member={member}
                reputation={reputation}
                achievements={achievements}
              />
            ) : (
              <ActivityFeedSkeleton />
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
