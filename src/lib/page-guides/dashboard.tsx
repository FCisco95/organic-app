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

function DashboardHeroVisual() {
  return (
    <div className="w-full max-w-xs mx-auto text-center">
      <div className="relative mx-auto w-20 h-20 mb-4">
        <div className="absolute inset-0 rounded-2xl bg-organic-terracotta-lightest0/20 animate-pulse" />
        <div className="relative flex items-center justify-center w-full h-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
          <span className="text-3xl">🏠</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {[
          { label: 'Hero', color: 'bg-organic-terracotta-lightest0' },
          { label: 'Trust Pulse', color: 'bg-amber-500' },
          { label: 'Navigation', color: 'bg-blue-500' },
          { label: 'Activity Feed', color: 'bg-emerald-500' },
          { label: 'Member Status', color: 'bg-purple-500' },
          { label: 'Stats', color: 'bg-cyan-500' },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-gray-200"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
        Your home base — everything the DAO is doing, at a glance.
      </p>
    </div>
  );
}

function TrustPulseVisual() {
  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-2 gap-2">
      <PulseHighlight>
        <GlassCard>
          <p className="text-[9px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <span className="text-amber-500">&#9679;</span> Sprint
          </p>
          <p className="mt-1 text-lg font-bold font-mono text-white">2d 14h</p>
          <p className="text-[10px] text-gray-400">Phase: active</p>
        </GlassCard>
      </PulseHighlight>
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
          <span className="text-blue-500">&#9679;</span> Proposals
        </p>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-300">
          <span>Public: 3</span>
          <span>Qualified: 1</span>
          <span>Discussion: 2</span>
          <span>Voting: 1</span>
        </div>
      </GlassCard>
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
          <span className="text-organic-terracotta">&#9679;</span> Leaderboard
        </p>
        <div className="mt-1 space-y-0.5 text-[10px]">
          <p className="text-gray-200">#1 Alice — 4,200 XP</p>
          <p className="text-gray-400">#2 Bob — 3,800 XP</p>
        </div>
      </GlassCard>
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
          <span className="text-emerald-500">&#9679;</span> Activity
        </p>
        <p className="mt-1 text-lg font-bold font-mono text-white">24</p>
        <p className="text-[10px] text-gray-400">Recent events</p>
      </GlassCard>
    </div>
  );
}

function NavCardsVisual() {
  const cards = [
    { icon: '📋', label: 'Tasks', desc: 'View & claim work' },
    { icon: '🗳️', label: 'Proposals', desc: 'Governance decisions' },
    { icon: '🏃', label: 'Sprints', desc: 'Execution cycles' },
    { icon: '📊', label: 'Analytics', desc: 'DAO metrics' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-2 gap-2">
      {cards.map((c) => (
        <GlassCard key={c.label} className="hover:border-organic-terracotta/30 transition-colors cursor-pointer">
          <span className="text-lg">{c.icon}</span>
          <p className="mt-1 text-xs font-semibold text-white">{c.label}</p>
          <p className="text-[10px] text-gray-400">{c.desc}</p>
        </GlassCard>
      ))}
    </div>
  );
}

function MemberStatusVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-xs font-semibold text-white">Your member status</p>
        <p className="text-[10px] text-gray-400 mt-1">
          Identity, governance access, and contribution footprint.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <PulseHighlight>
            <span className="inline-flex rounded-full bg-organic-terracotta-lightest0/20 border border-organic-terracotta/30 px-2 py-0.5 text-[10px] text-[#E8845C] font-medium">
              Verified member
            </span>
          </PulseHighlight>
          <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
            Organic ID #42
          </span>
          <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
            Governance access
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-7 px-3 rounded-md bg-white text-gray-900 text-[10px] font-medium flex items-center">
            View Tasks →
          </div>
          <span className="text-[10px] text-gray-400">Go to Profile →</span>
        </div>
      </GlassCard>
    </div>
  );
}

function StatsBarVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Community stats</p>
        <div className="space-y-2">
          {[
            { label: 'Tasks', width: '75%', color: 'bg-organic-terracotta' },
            { label: 'Sprints', width: '60%', color: 'bg-amber-400' },
            { label: 'Members', width: '45%', color: 'bg-blue-400' },
            { label: 'Proposals', width: '55%', color: 'bg-emerald-400' },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-14 text-right font-mono">{bar.label}</span>
              <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
              </div>
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
  title: 'Dashboard',
  steps: [
    {
      title: 'Welcome to Organic',
      description:
        'The dashboard is your home base. At a glance you see the DAO hero, live trust pulse cards, quick navigation to every section, a real-time activity feed, your member status, and platform-wide stats.',
      visual: <DashboardHeroVisual />,
    },
    {
      title: 'Trust Pulse',
      description:
        'Four live cards show key DAO health signals at a glance: the current sprint countdown, proposal stages, top contributors on the leaderboard, and recent activity count. This is your real-time trust surface.',
      visual: <TrustPulseVisual />,
    },
    {
      title: 'Quick Navigation',
      description:
        'Below the trust pulse, navigation cards let you jump directly into Tasks, Proposals, Sprints, Analytics, and more. Each card shows a brief description so you know what to expect.',
      visual: <NavCardsVisual />,
    },
    {
      title: 'Member Status',
      description:
        'This section shows your identity within the DAO — whether you\'re signed in, if you have an Organic ID, and your governance access level. Link a wallet holding $ORG to unlock full contributor capabilities.',
      visual: <MemberStatusVisual />,
    },
    {
      title: 'Supporting Stats',
      description:
        'A compact stats bar at the bottom summarizes platform-wide metrics: total tasks, active sprints, members, and proposals. Hover over any bar for more detail.',
      visual: <StatsBarVisual />,
    },
  ],
};
