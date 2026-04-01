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
      <div className="absolute -inset-1 rounded-lg bg-organic-terracotta/20 animate-pulse" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step visuals                                                      */
/* ------------------------------------------------------------------ */

function HubVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👥</span>
            <p className="text-xs font-bold text-white">Community</p>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            The people behind the <span className="text-organic-terracotta">DAO</span>.
          </p>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Leaderboard</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Directory</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Rankings</span>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function LeaderboardVisual() {
  const leaders = [
    { rank: 1, name: 'Alice', xp: '4,200', badge: 'bg-amber-400' },
    { rank: 2, name: 'Bob', xp: '3,800', badge: 'bg-gray-400' },
    { rank: 3, name: 'Carol', xp: '3,450', badge: 'bg-organic-terracotta' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">XP Leaderboard</p>
        <div className="space-y-1.5">
          {leaders.map((l, i) => (
            <div key={l.rank}>
              {i === 0 ? (
                <PulseHighlight>
                  <div className="flex items-center gap-2 py-1">
                    <span className={`w-5 h-5 rounded-full ${l.badge} flex items-center justify-center text-[9px] font-bold text-white`}>
                      {l.rank}
                    </span>
                    <span className="text-[10px] font-medium text-white flex-1">{l.name}</span>
                    <span className="text-[10px] font-mono text-organic-terracotta font-medium">{l.xp} XP</span>
                  </div>
                </PulseHighlight>
              ) : (
                <div className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                  <span className={`w-5 h-5 rounded-full ${l.badge} flex items-center justify-center text-[9px] font-bold text-white`}>
                    {l.rank}
                  </span>
                  <span className="text-[10px] text-gray-300 flex-1">{l.name}</span>
                  <span className="text-[10px] font-mono text-gray-400">{l.xp} XP</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function DirectoryVisual() {
  const members = [
    { name: 'Alice', role: 'Core', color: 'bg-organic-terracotta-lightest0' },
    { name: 'Bob', role: 'Contributor', color: 'bg-blue-400' },
    { name: 'Carol', role: 'Reviewer', color: 'bg-emerald-400' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Member Directory</p>
        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.name} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">
                {m.name[0]}
              </div>
              <span className="text-[10px] text-gray-300 flex-1">{m.name}</span>
              <span className={`rounded-full ${m.color}/20 border border-white/10 px-1.5 py-0.5 text-[8px] text-gray-300`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function RankingsSystemVisual() {
  const tiers = [
    { label: 'Diamond', color: 'bg-blue-400' },
    { label: 'Gold', color: 'bg-amber-400' },
    { label: 'Silver', color: 'bg-gray-400' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <PulseHighlight>
          <div className="rounded-lg border border-organic-terracotta/30 bg-organic-terracotta-lightest0/10 p-2 mb-2">
            <p className="text-[10px] text-organic-terracotta font-medium">Consistency &gt; bursts</p>
            <p className="text-[8px] text-gray-400 mt-0.5">Sustained participation is weighted more heavily.</p>
          </div>
        </PulseHighlight>
        <div className="flex gap-2">
          {tiers.map((t) => (
            <div key={t.label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${t.color}`} />
              <span className="text-[9px] text-gray-400">{t.label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Community',
  steps: [
    {
      title: 'Community Hub',
      description:
        'The Community page is where you discover the people behind the DAO. Browse contributor rankings, explore the member directory, and understand how reputation is earned through verified work.',
      visual: <HubVisual />,
    },
    {
      title: 'Leaderboard',
      description:
        'The XP leaderboard ranks contributors based on verified contributions — tasks completed, proposals authored, votes cast, and reviews given. Rankings update in real time as work is validated.',
      visual: <LeaderboardVisual />,
    },
    {
      title: 'Member Directory',
      description:
        'Browse all DAO members with filters for role, activity status, and contribution history. Each profile shows their role, task count, reputation score, and recent activity.',
      visual: <DirectoryVisual />,
    },
    {
      title: 'Rankings System',
      description:
        'Rankings reward consistency over bursts. Sustained participation — showing up regularly, delivering quality work, and staying engaged — is weighted more heavily than occasional high-output spikes.',
      visual: <RankingsSystemVisual />,
    },
  ],
};
