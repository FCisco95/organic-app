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
            <span className="text-lg">🏦</span>
            <p className="text-xs font-bold text-white">Treasury</p>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            Every token flow is tracked and <span className="text-orange-500">verifiable</span>.
          </p>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Balances</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Allocation</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Transparency</span>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function BalanceAllocationVisual() {
  const categories = [
    { label: 'Ops', color: 'bg-orange-500', width: '35%' },
    { label: 'Rewards', color: 'bg-emerald-400', width: '25%' },
    { label: 'Dev', color: 'bg-blue-400', width: '25%' },
    { label: 'Reserve', color: 'bg-amber-400', width: '15%' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <PulseHighlight>
          <p className="text-lg font-bold font-mono text-white">1,245,000 <span className="text-sm text-orange-500">$ORG</span></p>
        </PulseHighlight>
        <p className="text-[9px] text-gray-400 mt-1 mb-2">Total balance</p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {categories.map((c) => (
            <div key={c.label} className={`${c.color} rounded-sm`} style={{ width: c.width }} />
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          {categories.map((c) => (
            <div key={c.label} className="flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-sm ${c.color}`} />
              <span className="text-[8px] text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function EmissionPolicyVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Emission Policy</p>
        <div className="flex items-center gap-3">
          <PulseHighlight>
            <div className="w-10 h-10 rounded-full border border-orange-500/50 flex items-center justify-center">
              <span className="text-xs font-bold font-mono text-orange-500">2.5%</span>
            </div>
          </PulseHighlight>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-300">Treasury</span>
              <span className="text-orange-500">→</span>
              <span className="text-gray-300">Contributors</span>
            </div>
            <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: '60%' }} />
            </div>
            <p className="text-[8px] text-gray-400 mt-0.5">per sprint</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function TransactionHistoryVisual() {
  const txs = [
    { label: 'Sprint 12 payouts', amount: '-8,400', inflow: false },
    { label: 'Token sale tranche', amount: '+50,000', inflow: true },
    { label: 'Dev bounty: auth fix', amount: '-1,200', inflow: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Recent Transactions</p>
        <div className="space-y-1.5">
          {txs.map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${tx.inflow ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.inflow ? '↓' : '↑'}
                </span>
                <span className="text-[10px] text-gray-300">{tx.label}</span>
              </div>
              <PulseHighlight>
                <span className={`text-[10px] font-mono font-medium ${tx.inflow ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.amount}
                </span>
              </PulseHighlight>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function OnChainVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">On-Chain Verification</p>
        <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">Verified on Solana</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-400">Address</span>
            <PulseHighlight>
              <span className="text-[9px] font-mono text-gray-300">Org...x7Kf</span>
            </PulseHighlight>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-gray-400">Verified</span>
            <span className="text-[9px] font-mono text-gray-300">2 min ago</span>
          </div>
        </div>
        <p className="mt-1.5 text-[9px] text-orange-500 cursor-pointer">View on explorer →</p>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Treasury',
  steps: [
    {
      title: 'Treasury Overview',
      description:
        'The Treasury page shows how the DAO manages its funds. Transparency is a core value — every allocation, emission, and transaction is tracked and made visible to all members.',
      visual: <OverviewVisual />,
    },
    {
      title: 'Balance & Allocation',
      description:
        'View the current treasury balance alongside a category breakdown showing how funds are distributed across operations, contributor rewards, development, and reserves.',
      visual: <BalanceAllocationVisual />,
    },
    {
      title: 'Emission Policy',
      description:
        'The emission policy defines how tokens flow from the treasury to contributors each sprint. The rate is governance-controlled and tracks how much of the sprint budget has been distributed.',
      visual: <EmissionPolicyVisual />,
    },
    {
      title: 'Transaction History',
      description:
        'A complete ledger of treasury movements — inflows from token sales or revenue, outflows for sprint payouts, bounties, and operational costs. Every movement is timestamped and categorized.',
      visual: <TransactionHistoryVisual />,
    },
    {
      title: 'On-Chain Transparency',
      description:
        'All treasury data is verifiable on the Solana blockchain. The treasury address and last verification time are always visible. Click through to the explorer for full details.',
      visual: <OnChainVisual />,
    },
  ],
};
