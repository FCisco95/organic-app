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

function IncubatorVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <PulseHighlight>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <p className="text-xs font-bold text-white">Ideas Incubator</p>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            Where ideas become <span className="text-orange-500">proposals</span>.
          </p>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Discuss</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Vote</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] text-gray-300">Promote</span>
          </div>
        </GlassCard>
      </PulseHighlight>
    </div>
  );
}

function SubmitIdeaVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Submit an Idea</p>
        <div className="space-y-1.5">
          <PulseHighlight>
            <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
              <span className="text-[10px] text-gray-300">Mobile app for tasks</span>
            </div>
          </PulseHighlight>
          <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
            <span className="text-[10px] text-gray-400">Claim and update tasks from mobile...</span>
          </div>
          <div className="flex justify-end">
            <div className="h-6 px-3 rounded-md bg-orange-500 text-white text-[10px] font-medium flex items-center">
              Post
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function VotingVisual() {
  const ideas = [
    { title: 'Mobile app for tasks', votes: 24 },
    { title: 'Weekly DAO newsletter', votes: 18 },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Signal Your Interest</p>
        <div className="space-y-1.5">
          {ideas.map((idea, i) => (
            <div key={idea.title} className="flex items-center gap-2">
              {i === 0 ? (
                <PulseHighlight>
                  <div className="flex flex-col items-center w-7">
                    <span className="text-orange-500 text-xs leading-none">&#9650;</span>
                    <span className="text-[10px] font-mono font-bold text-orange-500">{idea.votes}</span>
                  </div>
                </PulseHighlight>
              ) : (
                <div className="flex flex-col items-center w-7">
                  <span className="text-gray-500 text-xs leading-none">&#9650;</span>
                  <span className="text-[10px] font-mono text-gray-400">{idea.votes}</span>
                </div>
              )}
              <span className="text-[10px] text-gray-300 flex-1 truncate">{idea.title}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function DiscoveryVisual() {
  const tabs = ['Hot', 'New', 'Top'];
  const previews = [
    { title: 'Mobile app for tasks', votes: 24 },
    { title: 'Reputation badges', votes: 15 },
  ];
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <div className="flex gap-1.5 mb-2">
          {tabs.map((tab, i) => (
            <div key={tab}>
              {i === 0 ? (
                <PulseHighlight>
                  <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[9px] text-orange-500 font-medium">
                    {tab}
                  </span>
                </PulseHighlight>
              ) : (
                <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] text-gray-400">
                  {tab}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {previews.map((p) => (
            <div key={p.title} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
              <span className="text-[10px] font-mono text-orange-500 w-5 text-center">{p.votes}</span>
              <span className="text-[10px] text-gray-300 truncate">{p.title}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function PromotionVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Idea → Proposal</p>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-white">Mobile app for tasks</span>
            <span className="text-[8px] text-orange-500">24 votes</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 animate-pulse" style={{ width: '80%' }} />
          </div>
        </div>
        <div className="flex justify-end">
          <PulseHighlight>
            <div className="h-6 px-3 rounded-md bg-orange-500 text-white text-[10px] font-medium flex items-center">
              Promote →
            </div>
          </PulseHighlight>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide export                                                      */
/* ------------------------------------------------------------------ */
export const guide: PageGuide = {
  title: 'Ideas',
  steps: [
    {
      title: 'Ideas Incubator',
      description:
        'The Ideas Incubator is a lightweight, pre-proposal space where DAO members can float rough ideas and start casual discussions. Think of it as a brainstorming channel — low friction, no formal structure required.',
      visual: <IncubatorVisual />,
    },
    {
      title: 'Submitting an Idea',
      description:
        'Post an idea by adding a title and description. Keep it casual and exploratory — there is no template or formal requirements. The goal is to start a conversation and see if others resonate with your thinking.',
      visual: <SubmitIdeaVisual />,
    },
    {
      title: 'Voting on Ideas',
      description:
        'Upvote ideas to signal your interest. Votes are a lightweight way to surface what the community cares about without committing to a full governance proposal. The most upvoted ideas rise to the top.',
      visual: <VotingVisual />,
    },
    {
      title: 'Trending & Discovery',
      description:
        'Browse ideas using sort modes — Hot shows the most active discussions, New shows the latest posts, and Top ranks by total upvotes. Find what resonates or discover ideas you missed.',
      visual: <DiscoveryVisual />,
    },
    {
      title: 'Promotion to Proposal',
      description:
        'When an idea gains enough traction — upvotes, comments, and community interest — it can be promoted to a formal governance proposal. This bridges casual brainstorming with structured decision-making.',
      visual: <PromotionVisual />,
    },
  ],
};
