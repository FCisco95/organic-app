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

function QuestSystemVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
              <span className="text-base">🎯</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Quest System</p>
              <p className="text-[10px] text-gray-400">Earn XP through challenges</p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-xs font-bold font-mono text-blue-400">3</p>
              <p className="text-[9px] text-gray-400">Daily</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-xs font-bold font-mono text-amber-400">2</p>
              <p className="text-[9px] text-gray-400">Weekly</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-xs font-bold font-mono text-purple-400">5</p>
              <p className="text-[9px] text-gray-400">Long-term</p>
            </div>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function DailyQuestsVisual() {
  const quests = [
    { label: 'Daily login', xp: 10, done: true },
    { label: 'Leave a comment', xp: 15, done: true },
    { label: 'Review a task', xp: 20, done: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[9px] uppercase tracking-wider text-gray-400">Daily quests</p>
          <div className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[9px] text-gray-500">Resets in 14h</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {quests.map((q) => (
            <div key={q.label} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center text-[8px] ${
                    q.done
                      ? 'bg-emerald-500/80 text-white'
                      : 'bg-white/5 border border-white/15 text-gray-500'
                  }`}
                >
                  {q.done ? '✓' : ''}
                </div>
                <span className={`text-[10px] ${q.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {q.label}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-orange-500">+{q.xp}</span>
            </div>
          ))}
        </div>
        <PulseHighlight>
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
            <span className="text-[10px] text-gray-300 font-medium">Progress</span>
            <span className="text-[10px] font-mono text-orange-500">2 / 3</span>
          </div>
        </PulseHighlight>
      </GlassCard>
    </div>
  );
}

function WeeklyQuestsVisual() {
  const quests = [
    { label: 'Complete a task', xp: 50, pct: 100, done: true },
    { label: 'Vote on a proposal', xp: 40, pct: 0, done: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[9px] uppercase tracking-wider text-gray-400">Weekly quests</p>
          <span className="text-[9px] text-amber-400 font-medium">Higher XP</span>
        </div>
        <div className="space-y-2">
          {quests.map((q) => (
            <div key={q.label} className="rounded-lg bg-white/5 p-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${q.done ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-[10px] text-gray-300">{q.label}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-orange-500">+{q.xp}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${q.done ? 'bg-emerald-400/80' : 'bg-amber-400/40'}`}
                  style={{ width: `${q.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function LongTermQuestsVisual() {
  const achievements = [
    { label: 'First sprint completed', icon: '🏃', unlocked: true },
    { label: 'Reputation: Trusted', icon: '⭐', unlocked: true },
    { label: '7-day login streak', icon: '🔒', unlocked: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2.5">Achievements</p>
        <div className="space-y-1.5">
          {achievements.map((a) => (
            <div
              key={a.label}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                a.unlocked ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{a.icon}</span>
                <span className={`text-[10px] font-medium ${a.unlocked ? 'text-purple-300' : 'text-gray-500'}`}>
                  {a.label}
                </span>
              </div>
              {a.unlocked ? (
                <span className="text-[9px] font-medium text-emerald-400">Unlocked</span>
              ) : (
                <span className="text-[9px] font-medium text-gray-600">Locked</span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function XpCadenceVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center gap-3 mb-2.5">
          <PulseHighlight>
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2 text-center">
              <p className="text-lg font-bold font-mono text-orange-500">1.5x</p>
              <p className="text-[9px] text-orange-400">Multiplier</p>
            </div>
          </PulseHighlight>
          <div className="flex-1">
            <div className="flex items-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <div
                  key={d}
                  className={`flex-1 h-5 rounded-sm flex items-center justify-center text-[7px] font-mono ${
                    d <= 5
                      ? 'bg-orange-500/70 text-white'
                      : 'bg-white/5 text-gray-600'
                  }`}
                >
                  {d <= 5 ? '✓' : d}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-500">5-day streak</p>
          </div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Tier progress</span>
            <span className="text-[10px] font-mono font-bold text-white">2,340 XP</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="mt-1 flex justify-between text-[8px] text-gray-500">
            <span>Contributor</span>
            <span>Trusted (3k)</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Quests',
  steps: [
    {
      title: 'Quest System',
      description:
        'Quests are gamified challenges that reward consistent participation. They come in three tiers — daily, weekly, and long-term — each offering increasing XP to grow your reputation in the DAO.',
      visual: <QuestSystemVisual />,
    },
    {
      title: 'Daily Quests',
      description:
        'Daily quests reset every 24 hours and include small actions like logging in, leaving a comment, or reviewing a task. They are quick to complete and keep you engaged with the community every day.',
      visual: <DailyQuestsVisual />,
    },
    {
      title: 'Weekly Quests',
      description:
        'Weekly quests offer higher XP rewards for more meaningful contributions: completing a task or voting on a proposal. They reset every Monday at 00:00 UTC.',
      visual: <WeeklyQuestsVisual />,
    },
    {
      title: 'Long-Term Quests',
      description:
        'Long-term quests are milestone achievements that track your overall journey: first sprint completed, reaching a reputation tier, or maintaining login streaks. These are one-time unlocks with large XP rewards.',
      visual: <LongTermQuestsVisual />,
    },
    {
      title: 'XP and Cadence',
      description:
        'Maintaining a login streak activates XP multipliers that boost all quest rewards. Your total quest XP contributes directly to your reputation score, which determines your tier and governance weight.',
      visual: <XpCadenceVisual />,
    },
  ],
};
