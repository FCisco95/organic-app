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

function SprintOverviewVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400">Current Sprint</p>
              <p className="mt-1 text-sm font-bold text-white">Sprint #7 — UI Polish</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-organic-terracotta">3d 8h</p>
              <p className="text-[10px] text-gray-400">remaining</p>
            </div>
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-organic-terracotta" />
              12 tasks
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
              5 contributors
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              48 pts
            </span>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function LifecycleVisual() {
  const phases = [
    { label: 'Planning', color: 'bg-blue-400', active: false },
    { label: 'Active', color: 'bg-organic-terracotta-lightest0', active: true },
    { label: 'Review', color: 'bg-amber-400', active: false },
    { label: 'Dispute', color: 'bg-red-400', active: false },
    { label: 'Settlement', color: 'bg-emerald-500', active: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Sprint lifecycle</p>
        <div className="flex items-center gap-1">
          {phases.map((p, i) => (
            <div key={p.label} className="flex items-center gap-1 flex-1">
              <div className="flex-1 flex flex-col items-center">
                {p.active ? (
                  <PulseHighlight>
                    <div className={`h-7 w-7 rounded-full ${p.color} flex items-center justify-center`}>
                      <span className="text-white text-[9px] font-bold">{i + 1}</span>
                    </div>
                  </PulseHighlight>
                ) : (
                  <div className={`h-7 w-7 rounded-full ${p.color}/20 flex items-center justify-center`}>
                    <span className="text-gray-400 text-[9px] font-bold">{i + 1}</span>
                  </div>
                )}
                <p className={`mt-1 text-[8px] ${p.active ? 'text-organic-terracotta font-semibold' : 'text-gray-500'}`}>
                  {p.label}
                </p>
              </div>
              {i < phases.length - 1 && (
                <div className={`h-0.5 w-2 ${i < 1 ? 'bg-blue-400/40' : 'bg-white/10'} -mt-3`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ViewsToggleVisual() {
  const views = [
    { label: 'Board', icon: '▦', active: true },
    { label: 'List', icon: '☰', active: false },
    { label: 'Timeline', icon: '⟿', active: false },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center gap-1 mb-2">
          {views.map((v) => (
            <button
              key={v.label}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium ${
                v.active
                  ? 'bg-organic-terracotta-lightest0 text-white'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              <span>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {['To Do', 'In Progress', 'Done'].map((col) => (
            <div key={col} className="rounded-md bg-white/5 p-1.5">
              <p className="text-[8px] uppercase tracking-wider text-gray-500 mb-1">{col}</p>
              {[1, 2].map((n) => (
                <div key={n} className="mb-1 rounded bg-white/10 border border-white/10 p-1">
                  <div className="h-1.5 w-3/4 rounded bg-white/15" />
                  <div className="mt-0.5 h-1 w-1/2 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function PhaseAdvancementVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400">Current phase</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="rounded-md bg-white/10 border border-white/10 px-2.5 py-1 text-[10px] text-gray-300 font-medium">
            Active
          </div>
          <PulseHighlight>
            <div className="rounded-md bg-organic-terracotta-lightest0 px-3 py-1 text-[10px] text-white font-medium flex items-center gap-1">
              Advance to Review <span className="text-[9px]">&rarr;</span>
            </div>
          </PulseHighlight>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          <p className="text-[9px] text-gray-500">Requires admin or council approval</p>
        </div>
      </GlassCard>
    </div>
  );
}

function CapacityPlanningVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] uppercase tracking-wider text-gray-400">Capacity</p>
          <p className="text-[10px] font-mono text-gray-300">
            <span className="text-organic-terracotta font-bold">36</span> / 48 pts
          </p>
        </div>
        <PulseHighlight>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-organic-terracotta to-organic-terracotta rounded-full"
              style={{ width: '75%' }}
            />
          </div>
        </PulseHighlight>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold font-mono text-white">12</p>
            <p className="text-[9px] text-gray-400">Assigned</p>
          </div>
          <div>
            <p className="text-sm font-bold font-mono text-organic-terracotta">24</p>
            <p className="text-[9px] text-gray-400">In progress</p>
          </div>
          <div>
            <p className="text-sm font-bold font-mono text-emerald-400">12</p>
            <p className="text-[9px] text-gray-400">Remaining</p>
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
  title: 'Sprints',
  steps: [
    {
      title: 'Sprint Overview',
      description:
        'Sprints are time-boxed execution cycles that group tasks into focused work windows. Each sprint has a name, deadline countdown, task count, contributor roster, and a point budget so the team can coordinate around a shared goal.',
      visual: <SprintOverviewVisual />,
    },
    {
      title: 'Sprint Lifecycle',
      description:
        'Every sprint moves through five sequential phases: Planning (scope and assign tasks), Active (contributors execute work), Review (submissions are evaluated), Dispute Window (challenges can be filed), and Settlement (points and payouts finalize).',
      visual: <LifecycleVisual />,
    },
    {
      title: 'Views',
      description:
        'Toggle between Board, List, and Timeline views to see sprint tasks the way you prefer. Board shows a kanban layout, List is a compact table, and Timeline plots tasks against the sprint duration.',
      visual: <ViewsToggleVisual />,
    },
    {
      title: 'Phase Advancement',
      description:
        'Admins advance a sprint from one phase to the next using the phase control button. Each transition locks in the previous phase — once a sprint moves to Review, no new task submissions are accepted.',
      visual: <PhaseAdvancementVisual />,
    },
    {
      title: 'Capacity Planning',
      description:
        'The capacity bar shows how many story points have been assigned or are in progress versus the sprint budget. Use this to avoid overloading a sprint and to spot available bandwidth for new tasks.',
      visual: <CapacityPlanningVisual />,
    },
  ],
};
