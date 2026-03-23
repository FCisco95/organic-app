import type { PageGuide } from './types';

/* ------------------------------------------------------------------ */
/*  Shared visual helpers                                             */
/* ------------------------------------------------------------------ */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/15 bg-white/10 backdrop-blur p-3 ${className}`}>
      {children}
    </div>
  );
}

function PulseHighlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-lg bg-orange-400/20 animate-pulse" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step visuals                                                      */
/* ------------------------------------------------------------------ */

function OverviewVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📊</span>
            <p className="text-xs font-bold text-white">Analytics</p>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            Your data-driven view into <span className="text-orange-500">DAO health</span>.
          </p>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Activity</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Governance</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Contributors</span>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function ActivityTrendsVisual() {
  const days = ['M', 'T', 'W', 'T', 'F'];
  const heights = [40, 70, 55, 85, 60];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Activity Trends</p>
        <div className="flex items-end gap-2 h-16">
          {days.map((day, i) => (
            <div key={`${day}-${i}`} className="flex-1 flex flex-col items-center gap-1">
              <PulseHighlight>
                <div
                  className="w-full rounded-sm bg-orange-500/80"
                  style={{ height: `${(heights[i] / 100) * 48}px` }}
                />
              </PulseHighlight>
              <span className="text-[8px] text-gray-400 font-mono">{day}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function PersonalStatsVisual() {
  const stats = [
    { label: 'Tasks', value: '18', color: 'text-orange-500' },
    { label: 'Voted', value: '12', color: 'text-blue-400' },
    { label: 'XP', value: '2.4k', color: 'text-emerald-400' },
    { label: 'Streak', value: '7d', color: 'text-amber-400' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Your Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <div key={s.label}>
              {i === 0 ? (
                <PulseHighlight>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
                    <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
                    <p className="text-[8px] text-gray-400">{s.label}</p>
                  </div>
                </PulseHighlight>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
                  <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[8px] text-gray-400">{s.label}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function GovernanceHealthVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Governance Health</p>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-[9px] text-gray-300">Participation</span>
              <span className="text-[9px] font-mono text-orange-500">82%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <PulseHighlight>
                <div className="h-1.5 rounded-full bg-orange-500" style={{ width: '82%' }} />
              </PulseHighlight>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-[9px] text-gray-300">Proposal success</span>
              <span className="text-[9px] font-mono text-emerald-400">72%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: '72%' }} />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function KpiCardsVisual() {
  const kpis = [
    { label: 'Members', value: '128', color: 'text-blue-400' },
    { label: 'Active', value: '47', color: 'text-emerald-400' },
    { label: 'Tasks', value: '23', color: 'text-orange-500' },
    { label: 'Gov.', value: '82%', color: 'text-amber-400' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="grid grid-cols-4 gap-1.5">
        {kpis.map((kpi, i) => (
          <div key={kpi.label}>
            {i === 0 ? (
              <PulseHighlight>
                <GlassCard className="p-2 text-center">
                  <p className={`text-sm font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[7px] text-gray-400 uppercase tracking-wider">{kpi.label}</p>
                </GlassCard>
              </PulseHighlight>
            ) : (
              <GlassCard className="p-2 text-center">
                <p className={`text-sm font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[7px] text-gray-400 uppercase tracking-wider">{kpi.label}</p>
              </GlassCard>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Analytics',
  steps: [
    {
      title: 'Analytics Overview',
      description:
        'The Analytics page is your data-driven view into DAO health. It aggregates activity, governance outcomes, and contributor engagement so you can understand how the organization is performing at a glance.',
      visual: <OverviewVisual />,
    },
    {
      title: 'Activity Trends',
      description:
        'A daily and weekly chart tracks key events across the DAO — tasks completed, proposals created, votes cast, and comments made. Toggle between time ranges to spot patterns and momentum shifts.',
      visual: <ActivityTrendsVisual />,
    },
    {
      title: 'Personal Stats',
      description:
        'Your personal contribution snapshot shows tasks completed, proposals voted on, total XP earned, and your current activity streak. Use this to track your own impact within the DAO.',
      visual: <PersonalStatsVisual />,
    },
    {
      title: 'Governance Health',
      description:
        'This section evaluates how well governance is functioning — voter participation rates and proposal success ratios. Healthy governance means proposals get adequate discussion and turnout.',
      visual: <GovernanceHealthVisual />,
    },
    {
      title: 'KPI Cards',
      description:
        'Top-level KPI cards give you instant snapshots of the most important numbers: total members, active contributors, tasks in the current sprint, and the governance participation rate.',
      visual: <KpiCardsVisual />,
    },
  ],
};
