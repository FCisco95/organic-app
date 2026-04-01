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

function RewardsOverviewVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Your rewards</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-sm font-bold font-mono text-white">14</p>
              <p className="text-[9px] text-gray-400">Tasks done</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-sm font-bold font-mono text-organic-terracotta">820</p>
              <p className="text-[9px] text-gray-400">Points earned</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-sm font-bold font-mono text-emerald-400">$240</p>
              <p className="text-[9px] text-gray-400">Total paid</p>
            </div>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function PointsSystemVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Points accumulation</p>
        <div className="space-y-1.5">
          {[
            { task: 'Fix auth redirect', pts: 5 },
            { task: 'Design settings page', pts: 8 },
          ].map((t) => (
            <div key={t.task} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-300">{t.task}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-organic-terracotta">+{t.pts} pts</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[9px] text-gray-500">Threshold</span>
          <PulseHighlight>
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-organic-terracotta rounded-full" style={{ width: '65%' }} />
              </div>
              <span className="text-[10px] font-mono text-gray-400">650/1k</span>
            </div>
          </PulseHighlight>
        </div>
      </GlassCard>
    </div>
  );
}

function ClaimingVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400">Claim rewards</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
            <p className="text-sm font-bold font-mono text-emerald-400">1,024 pts</p>
            <p className="text-[9px] text-emerald-400/70">Claimable</p>
          </div>
          <PulseHighlight>
            <div className="rounded-md bg-organic-terracotta-lightest0 px-4 py-2 text-[10px] text-white font-medium cursor-pointer">
              Submit claim
            </div>
          </PulseHighlight>
        </div>
        <p className="mt-2 text-[9px] text-gray-500">
          Claims are batched and reviewed before payout.
        </p>
      </GlassCard>
    </div>
  );
}

function ApprovalFlowVisual() {
  const steps = [
    { label: 'Submitted', done: true },
    { label: 'Review', done: true },
    { label: 'Batch', done: false },
    { label: 'Paid', done: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Approval pipeline</p>
        <div className="flex items-center">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    s.done
                      ? 'bg-organic-terracotta-lightest0 text-white'
                      : 'bg-white/10 text-gray-500'
                  }`}
                >
                  {s.done ? '\u2713' : i + 1}
                </div>
                <p className={`mt-1 text-[8px] ${s.done ? 'text-organic-terracotta font-medium' : 'text-gray-500'}`}>
                  {s.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-3 ${s.done ? 'bg-organic-terracotta/40' : 'bg-white/10'} -mt-3`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function PayoutHistoryVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Payout history</p>
        <div className="space-y-1.5">
          {[
            { date: 'Mar 15', amount: '$120', sprint: 'Sprint #6' },
            { date: 'Mar 01', amount: '$80', sprint: 'Sprint #5' },
          ].map((p) => (
            <div key={p.date} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-300">{p.sprint}</span>
                <span className="text-[10px] text-gray-500">{p.date}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">{p.amount}</span>
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
  title: 'Rewards',
  steps: [
    {
      title: 'Rewards Overview',
      description:
        'The rewards page tracks how your contributions translate into payouts. See your completed tasks, earned points, and total compensation in one place.',
      visual: <RewardsOverviewVisual />,
    },
    {
      title: 'Points System',
      description:
        'Every approved task earns points toward a payout threshold. The progress bar shows how close you are to the next claimable amount. Pending tasks appear but do not count until approved.',
      visual: <PointsSystemVisual />,
    },
    {
      title: 'Claiming Rewards',
      description:
        'When your accumulated points reach the threshold, a claim button activates. Submit your claim to enter the review queue. Claims are batched so treasury can process them efficiently.',
      visual: <ClaimingVisual />,
    },
    {
      title: 'Approval Flow',
      description:
        'Submitted claims go through a pipeline: council members review them for accuracy, then treasury batches approved claims for on-chain payout. You can track your claim status at each stage.',
      visual: <ApprovalFlowVisual />,
    },
    {
      title: 'Payout History',
      description:
        'The distributions tab shows all completed payouts with dates, sprint associations, and amounts. Use this as a record of your compensation history within the DAO.',
      visual: <PayoutHistoryVisual />,
    },
  ],
};
