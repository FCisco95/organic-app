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

function DisputeSystemVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
              <span className="text-base">⚖️</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Dispute System</p>
              <p className="text-[10px] text-gray-400">Challenge unfair reviews</p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
              <p className="text-sm font-bold font-mono text-orange-500">3</p>
              <p className="text-[9px] text-gray-400">Active</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
              <p className="text-sm font-bold font-mono text-emerald-400">12</p>
              <p className="text-[9px] text-gray-400">Resolved</p>
            </div>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function WhenToFileVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2.5">Sprint phases</p>
        <div className="flex items-center gap-1 mb-2.5">
          {['Planning', 'Active', 'Review', 'Dispute', 'Settle'].map((phase, i) => (
            <div key={phase} className="flex-1 text-center">
              {phase === 'Dispute' ? (
                <PulseHighlight>
                  <div className="rounded-md bg-red-500/80 py-1.5 px-1">
                    <p className="text-[8px] font-bold text-white">{phase}</p>
                  </div>
                </PulseHighlight>
              ) : (
                <div className={`rounded-md py-1.5 px-1 ${i < 3 ? 'bg-white/10' : 'bg-white/5'}`}>
                  <p className="text-[8px] text-gray-400">{phase}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2">
          <p className="text-[10px] text-orange-400 font-medium">Window: 48 hours</p>
        </div>
      </GlassCard>
    </div>
  );
}

function XpStakeVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <PulseHighlight>
          <div className="flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2">
            <span className="text-[10px] text-orange-400 font-medium">Stake to file</span>
            <span className="text-sm font-bold font-mono text-orange-500">50 XP</span>
          </div>
        </PulseHighlight>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
            <p className="text-[9px] text-emerald-400 font-medium">Upheld</p>
            <p className="text-xs font-bold font-mono text-emerald-400">+50 XP</p>
            <p className="text-[8px] text-emerald-400/60">Returned</p>
          </div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
            <p className="text-[9px] text-red-400 font-medium">Denied</p>
            <p className="text-xs font-bold font-mono text-red-400">-50 XP</p>
            <p className="text-[8px] text-red-400/60">Forfeited</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function ArbitrationVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2.5">Council votes</p>
        <div className="space-y-1.5">
          {[
            { name: 'Member A', vote: 'Uphold', color: 'bg-emerald-400' },
            { name: 'Member B', vote: 'Deny', color: 'bg-red-400' },
            { name: 'Member C', vote: 'Pending', color: 'bg-gray-500' },
          ].map((m) => (
            <div key={m.name} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-[8px] text-gray-300">{m.name.slice(-1)}</span>
                </div>
                <span className="text-[10px] text-gray-300">{m.name}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-medium">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${m.color}`} />
                <span className={m.vote === 'Pending' ? 'text-gray-500' : m.vote === 'Uphold' ? 'text-emerald-400' : 'text-red-400'}>
                  {m.vote}
                </span>
              </span>
            </div>
          ))}
        </div>
        <PulseHighlight>
          <div className="mt-2.5 rounded-lg bg-white/5 p-2 text-center">
            <p className="text-[10px] text-gray-400">
              Majority: <span className="font-mono font-bold text-orange-500">3 of 5</span>
            </p>
          </div>
        </PulseHighlight>
      </GlassCard>
    </div>
  );
}

function ResolutionVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-emerald-400 text-[10px] font-bold">&#10003;</span>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Dispute #42 — Upheld</p>
            <p className="text-[9px] text-gray-500">Resolved Mar 12</p>
          </div>
        </div>
        <PulseHighlight>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
              <span className="text-[10px] text-gray-400">XP stake returned</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">+50 XP</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
              <span className="text-[10px] text-gray-400">Points adjusted</span>
              <span className="text-[10px] font-mono font-bold text-orange-500">+8 pts</span>
            </div>
          </div>
        </PulseHighlight>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Disputes',
  steps: [
    {
      title: 'Dispute System',
      description:
        'The dispute system is a fairness mechanism that lets contributors challenge task review decisions. If you believe a review was incorrect or unfair, you can file a dispute for council arbitration.',
      visual: <DisputeSystemVisual />,
    },
    {
      title: 'When to File',
      description:
        'Disputes can only be filed during the sprint dispute window — a fixed period after the review phase ends. Once the window closes and settlement begins, no new disputes are accepted.',
      visual: <WhenToFileVisual />,
    },
    {
      title: 'XP Stake',
      description:
        'Filing a dispute requires staking XP. If the council upholds your dispute, your staked XP is returned. If the dispute is denied, you forfeit the staked amount. This prevents frivolous filings.',
      visual: <XpStakeVisual />,
    },
    {
      title: 'Arbitration Process',
      description:
        'Council members independently review the dispute evidence and cast votes. A majority is required for a decision. Votes are visible once all council members have voted or the deadline passes.',
      visual: <ArbitrationVisual />,
    },
    {
      title: 'Resolution',
      description:
        'Dispute resolutions are binding. If upheld, task points are re-credited and XP stakes returned. If denied, the original review stands and the stake is forfeited. All adjustments happen automatically.',
      visual: <ResolutionVisual />,
    },
  ],
};
