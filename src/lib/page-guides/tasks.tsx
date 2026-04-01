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

function BoardOverviewVisual() {
  const tasks = [
    { title: 'Design token page UI', pts: 150, status: 'Open' },
    { title: 'Write RLS policies', pts: 200, status: 'Claimed' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      {/* Filter bar */}
      <GlassCard className="!p-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-400">
            Category ▾
          </span>
          <span className="rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-400">
            Sprint ▾
          </span>
          <div className="flex-1 rounded-md border border-white/15 px-2 py-0.5 text-[9px] text-gray-500">
            Search…
          </div>
        </div>
      </GlassCard>
      {/* Task rows */}
      <PulseHighlight>
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <GlassCard key={t.title} className="!p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-white truncate">{t.title}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] font-bold text-organic-terracotta">{t.pts} pts</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-medium border ${
                      t.status === 'Open'
                        ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
                        : 'bg-blue-500/20 border-blue-400/30 text-blue-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </PulseHighlight>
    </div>
  );
}

function StatusFlowVisual() {
  const statuses = [
    { label: 'Open', color: 'bg-emerald-500' },
    { label: 'Claimed', color: 'bg-blue-500' },
    { label: 'Review', color: 'bg-amber-500' },
    { label: 'Approved', color: 'bg-organic-terracotta-lightest0' },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-3">Task lifecycle</p>
        <div className="flex items-center justify-between">
          {statuses.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full ${s.color} flex items-center justify-center`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                </div>
                <span className="text-[9px] font-medium text-gray-300">{s.label}</span>
              </div>
              {i < statuses.length - 1 && (
                <span className="text-gray-500 text-[10px] font-mono mb-4">→</span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ClaimTaskVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white">Build notification system</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Sprint 12 · Backend</p>
          </div>
          <span className="font-mono text-[10px] font-bold text-organic-terracotta">300 pts</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 text-[8px] text-emerald-400 font-medium">
            Open
          </span>
          <span className="text-[9px] text-gray-500">Due in 5 days</span>
        </div>
        <div className="mt-3 border-t border-white/10 pt-3">
          <PulseHighlight>
            <button className="w-full rounded-md bg-organic-terracotta-lightest0 text-white text-[10px] font-medium py-1.5 px-3">
              Claim Task →
            </button>
          </PulseHighlight>
        </div>
      </GlassCard>
    </div>
  );
}

function SubmitWorkVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Submit proof of work</p>
        <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-gray-500 mb-2">
          PR link or description…
        </div>
        <PulseHighlight>
          <button className="w-full rounded-md bg-organic-terracotta-lightest0 text-white text-[10px] font-medium py-1.5">
            Submit for Review
          </button>
        </PulseHighlight>
      </GlassCard>
    </div>
  );
}

function PointsXPVisual() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <div className="flex gap-2">
        <PulseHighlight>
          <GlassCard className="flex-1 flex flex-col items-center !py-2.5">
            <span className="font-mono text-lg font-bold text-organic-terracotta">300</span>
            <span className="text-[9px] text-gray-400 font-medium">Points</span>
          </GlassCard>
        </PulseHighlight>
        <GlassCard className="flex-1 flex flex-col items-center !py-2.5">
          <span className="font-mono text-lg font-bold text-white">+45</span>
          <span className="text-[9px] text-gray-400 font-medium">XP gained</span>
        </GlassCard>
      </div>
      <GlassCard className="!py-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-400">Lv 4</span>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-organic-terracotta-lightest0" style={{ width: '65%' }} />
          </div>
          <span className="text-[9px] font-mono text-gray-400">Lv 5</span>
        </div>
      </GlassCard>
    </div>
  );
}

function FiltersAndSortingVisual() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <GlassCard className="!p-2">
        <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">Filters</p>
        <div className="flex items-center gap-1.5">
          <PulseHighlight>
            <span className="rounded-full bg-organic-terracotta-lightest0/20 border border-organic-terracotta/30 px-2 py-0.5 text-[9px] text-[#E8845C] font-medium">
              Frontend ✕
            </span>
          </PulseHighlight>
          <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-400">
            Sprint 12 ✕
          </span>
          <span className="text-[9px] text-organic-terracotta">Clear all</span>
        </div>
      </GlassCard>
      <GlassCard className="!p-2">
        <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">Sort by</p>
        <div className="flex items-center gap-1">
          <PulseHighlight>
            <span className="rounded-md bg-organic-terracotta-lightest0 text-white px-2 py-0.5 text-[9px] font-medium">
              Newest
            </span>
          </PulseHighlight>
          <span className="rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-400">
            Due Date
          </span>
          <span className="rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] text-gray-400">
            Points
          </span>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Tasks',
  steps: [
    {
      title: 'Task Board Overview',
      description:
        'The Tasks page is the work hub of Organic. It displays a filterable board of all tasks in the DAO — from open bounties to completed work. Each card shows the task title, category label, assignee, point value, and current status. Use the filter bar at the top to narrow by category, contributor, sprint, or keyword search.',
      visual: <BoardOverviewVisual />,
    },
    {
      title: 'Task Statuses',
      description:
        'Every task follows a four-stage lifecycle. Open tasks are available for anyone to claim. Once claimed, the task moves to Claimed and is assigned to you. After you submit proof of work it enters In Review, where an admin verifies the deliverable. Finally, Approved means the work is accepted and rewards are distributed.',
      visual: <StatusFlowVisual />,
    },
    {
      title: 'Claiming a Task',
      description:
        'Found a task that matches your skills? Open it and hit "Claim Task" to assign yourself as the contributor. Once claimed, the task is yours — you\'ll see a due date and the point reward. Only one contributor can claim a task at a time, so move fast on high-value work.',
      visual: <ClaimTaskVisual />,
    },
    {
      title: 'Submitting Work',
      description:
        'When your work is done, submit proof — a pull request link, a description of what you built, or file attachments. Your submission goes to an admin or reviewer who will verify the deliverable meets the task requirements before approving it.',
      visual: <SubmitWorkVisual />,
    },
    {
      title: 'Points and XP',
      description:
        'Approved tasks earn you points and XP. Points reflect the value of the work completed and may translate to token rewards. XP accumulates toward your contributor level, unlocking higher-tier tasks and governance privileges as you grow within the DAO.',
      visual: <PointsXPVisual />,
    },
    {
      title: 'Filters and Sorting',
      description:
        'Use filters to focus on what matters — narrow by category (Frontend, Backend, QA), specific sprints, or contributors. Sort results by newest, oldest, due date, or point value. Active filters appear as removable chips. Pagination at the bottom lets you browse through all available tasks.',
      visual: <FiltersAndSortingVisual />,
    },
  ],
};
