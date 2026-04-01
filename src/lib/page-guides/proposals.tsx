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

function GovernanceHubVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard className="flex flex-col items-center text-center">
        <span className="text-3xl mb-2">🗳️</span>
        <p className="text-sm font-bold text-white">
          Shape the future of <span className="text-organic-terracotta">Organic</span>
        </p>
        <p className="mt-1 text-[10px] text-gray-400">
          Community-driven governance for every token holder
        </p>
        <div className="mt-3 flex gap-1.5">
          <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-300">
            On-chain voting
          </span>
          <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-300">
            Transparent
          </span>
          <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-300">
            Decentralized
          </span>
        </div>
      </GlassCard>
    </div>
  );
}

function LifecycleVisual() {
  const stages = [
    { label: 'Public', color: 'bg-gray-400' },
    { label: 'Qualified', color: 'bg-blue-400' },
    { label: 'Discussion', color: 'bg-amber-400' },
    { label: 'Voting', color: 'bg-organic-terracotta-lightest0' },
    { label: 'Finalized', color: 'bg-emerald-500' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-3">Proposal lifecycle</p>
        <div className="flex items-center justify-between">
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full ${s.color} flex items-center justify-center shadow-sm`}>
                  <div className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <span className="text-[8px] font-medium text-gray-300">{s.label}</span>
              </div>
              {i < stages.length - 1 && (
                <div className="w-3 h-px bg-gray-500 mb-4" />
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SubmitProposalVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[10px] font-semibold text-white mb-2">New Proposal</p>
        <div className="space-y-2">
          <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-gray-500">
            Increase contributor reward pool by 15%
          </div>
          <div className="flex gap-1.5">
            {['Feature', 'Treasury', 'Dev'].map((cat) => (
              <span
                key={cat}
                className={`rounded-full px-2 py-0.5 text-[9px] border ${
                  cat === 'Treasury'
                    ? 'bg-organic-terracotta-lightest0/20 border-organic-terracotta/30 text-[#E8845C] font-medium'
                    : 'bg-white/5 border-white/15 text-gray-400'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
          <PulseHighlight>
            <button className="w-full rounded-md bg-organic-terracotta-lightest0 text-white text-[10px] font-medium py-1.5">
              Submit Proposal
            </button>
          </PulseHighlight>
        </div>
      </GlassCard>
    </div>
  );
}

function QualificationVisual() {
  const thresholds = [
    { label: 'Endorsements', value: '12 / 10', pct: '100%', color: 'bg-organic-terracotta-lightest0' },
    { label: 'Replies', value: '7 / 5', pct: '100%', color: 'bg-blue-400' },
    { label: 'Participants', value: '3 / 5', pct: '60%', color: 'bg-gray-400' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2.5">Qualification</p>
        <div className="space-y-2">
          {thresholds.map((t) => (
            <div key={t.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-gray-300">{t.label}</span>
                <span className="text-[9px] font-mono text-gray-400">{t.value}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${t.color} rounded-full`} style={{ width: t.pct }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5">
          <PulseHighlight>
            <span className="inline-flex rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[9px] text-emerald-400 font-medium">
              Qualified ✓
            </span>
          </PulseHighlight>
        </div>
      </GlassCard>
    </div>
  );
}

function VotingVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-semibold text-white">Vote Distribution</p>
          <span className="text-[9px] text-gray-500 font-mono">1d 8h left</span>
        </div>
        {/* Combined bar */}
        <div className="h-4 rounded-full overflow-hidden flex mb-2">
          <div className="bg-emerald-500 h-full" style={{ width: '71%' }} />
          <div className="bg-red-400 h-full" style={{ width: '29%' }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-gray-300">For</span>
            <span className="text-[9px] font-mono text-white font-medium">71%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[9px] text-gray-300">Against</span>
            <span className="text-[9px] font-mono text-white font-medium">29%</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function FilterDiscoveryVisual() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <GlassCard className="!p-2">
        <div className="flex items-center gap-1 mb-1.5">
          {['All', 'Feature', 'Treasury'].map((cat) => (
            <span
              key={cat}
              className={`rounded-full px-2 py-0.5 text-[9px] border ${
                cat === 'All'
                  ? 'bg-organic-terracotta-lightest0 border-organic-terracotta text-white font-medium'
                  : 'bg-white/5 border-white/15 text-gray-400'
              }`}
            >
              {cat}
            </span>
          ))}
          <span className="rounded-full bg-white/5 border border-white/15 px-2 py-0.5 text-[9px] text-gray-500">
            Hot ↓
          </span>
        </div>
      </GlassCard>
      <div className="grid grid-cols-2 gap-2">
        <GlassCard className="!p-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 text-[8px] text-amber-400">
              Discussion
            </span>
          </div>
          <p className="text-[10px] font-semibold text-white leading-tight">Add dark mode</p>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-gray-500">
            <span>▲ 24</span>
            <span>💬 8</span>
          </div>
        </GlassCard>
        <GlassCard className="!p-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="rounded-full bg-organic-terracotta-lightest0/20 border border-organic-terracotta/30 px-1.5 py-0.5 text-[8px] text-[#E8845C]">
              Voting
            </span>
          </div>
          <p className="text-[10px] font-semibold text-white leading-tight">Fund marketing</p>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-gray-500">
            <span>▲ 41</span>
            <span>💬 15</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Proposals',
  steps: [
    {
      title: 'Governance Hub',
      description:
        'Proposals are the governance engine of Organic. Any verified member can submit an idea that affects the DAO — from treasury allocations to feature priorities and community rules. Everything is transparent and driven by token holders.',
      visual: <GovernanceHubVisual />,
    },
    {
      title: 'Proposal Lifecycle',
      description:
        'Every proposal flows through five stages: Public (open for initial feedback), Qualified (meets engagement thresholds), Discussion (structured debate period), Voting (token-weighted on-chain vote), and Finalized (outcome recorded). This pipeline ensures only well-vetted proposals reach a vote.',
      visual: <LifecycleVisual />,
    },
    {
      title: 'Submitting a Proposal',
      description:
        'Members with an Organic ID can submit proposals by choosing a category — feature, governance, treasury, community, or development — writing a title and description, and publishing. New proposals enter the Public stage where the community can endorse and discuss them.',
      visual: <SubmitProposalVisual />,
    },
    {
      title: 'Qualification',
      description:
        'A proposal advances from Public to Qualified once it hits engagement thresholds: enough community endorsements, discussion replies, and unique participants. This filters out low-effort proposals and ensures only ideas with real support move forward.',
      visual: <QualificationVisual />,
    },
    {
      title: 'Voting',
      description:
        'When a proposal reaches the Voting stage, token holders cast votes weighted by their $ORG balance. A live vote banner highlights active votes across the app. Results are recorded on-chain and the proposal moves to Finalized with a clear outcome — passed, rejected, or expired.',
      visual: <VotingVisual />,
    },
    {
      title: 'Filtering & Discovery',
      description:
        'Use category filters to narrow proposals by type and sort by new, hot, most-discussed, or most-voted. Each proposal card shows its current stage, category, vote count, and comment count so you can quickly find what matters to you. The governance sidebar displays stage counts at a glance.',
      visual: <FilterDiscoveryVisual />,
    },
  ],
};
