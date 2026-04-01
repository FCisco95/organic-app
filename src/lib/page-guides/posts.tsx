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

/* ------------------------------------------------------------------ */
/*  Step visuals                                                      */
/* ------------------------------------------------------------------ */

function PointsXpBasicsVisual() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-organic-terracotta-lightest0/20 flex items-center justify-center">
            <span className="text-xs">🪙</span>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Points</p>
            <p className="text-[9px] text-gray-400">Spendable currency</p>
          </div>
        </div>
        <div className="flex gap-1 text-[9px]">
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">Earn from tasks</span>
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">Earn from posts</span>
          <span className="px-1.5 py-0.5 rounded bg-organic-terracotta-lightest0/20 text-[#E8845C]">Claim for ORG</span>
        </div>
      </GlassCard>
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-xs">⚡</span>
          </div>
          <div>
            <p className="text-xs font-bold text-white">XP</p>
            <p className="text-[9px] text-gray-400">Progression metric</p>
          </div>
        </div>
        <div className="flex gap-1 text-[9px]">
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Everything earns XP</span>
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Airdrops</span>
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">NFTs</span>
        </div>
      </GlassCard>
    </div>
  );
}

function EarningPointsVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">How to earn points</p>
        <div className="space-y-1.5">
          {[
            { action: 'Complete bounty tasks', pts: '10-100+', icon: '📋' },
            { action: 'Post organic content', pts: '+3', icon: '🌿' },
            { action: 'Receive likes (organic)', pts: '+1 each', icon: '❤️' },
            { action: 'Receive comments (organic)', pts: '+2 each', icon: '💬' },
            { action: 'Daily & weekly quests', pts: '5-30', icon: '🎯' },
          ].map(({ action, pts, icon }) => (
            <div key={action} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{icon}</span>
                <span className="text-[10px] text-white">{action}</span>
              </div>
              <span className="text-[10px] font-bold font-mono text-green-400">{pts}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SpendingPointsVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Spending points</p>
        <div className="space-y-1.5">
          {[
            { action: 'Non-organic link share', cost: '5 pts' },
            { action: 'Non-organic text post', cost: '8 pts' },
            { action: 'Non-organic thread', cost: '12 pts' },
            { action: 'Promote: Spotlight (24h)', cost: '25 pts' },
            { action: 'Promote: Feature (48h)', cost: '50 pts' },
            { action: 'Promote: Mega Boost (72h)', cost: '100 pts' },
          ].map(({ action, cost }) => (
            <div key={action} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
              <span className="text-[10px] text-white">{action}</span>
              <span className="text-[10px] font-bold font-mono text-[#E8845C]">{cost}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function OrganicPostsVisual() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-xs">🌿</span>
          </div>
          <p className="text-xs font-bold text-white">Organic-Related Posts</p>
        </div>
        <div className="space-y-1.5 text-[10px] text-gray-300">
          <p>Posts about Organic DAO, ORG token, governance, or the ecosystem.</p>
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-1.5">
            <p className="text-green-300 font-medium">3 free organic posts per week</p>
            <p className="text-[9px] text-gray-400 mt-0.5">After that, discounted rate (3-8 pts)</p>
          </div>
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-1.5">
            <p className="text-green-300 font-medium">Bonus XP & points from engagement</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Likes and comments on organic posts earn more</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard className="bg-organic-terracotta-lightest0/5 border-organic-terracotta/20">
        <p className="text-[10px] text-[#E8845C]">
          ⚠️ Community can flag posts that are incorrectly tagged as organic. 3 flags removes the bonus.
        </p>
      </GlassCard>
    </div>
  );
}

function TipsVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Tips for new members</p>
        <div className="space-y-1.5">
          {[
            '1. Start with your 3 free organic posts this week',
            '2. Engage with organic posts for bonus XP',
            '3. Check quests daily — easy points and XP',
            '4. Browse tasks — bounties earn the most points',
            '5. Save up to promote a post for extra visibility',
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
              <span className="text-[10px] text-white">{tip}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide definition                                                  */
/* ------------------------------------------------------------------ */

export const guide: PageGuide = {
  title: 'Posts & Points Economy',
  steps: [
    {
      title: 'Points & XP — Two Currencies',
      description:
        'Points are your spendable currency — earn them from tasks, quests, and organic posts. Claim them for ORG tokens when ready. XP tracks your growth — everything earns XP, and leveling up unlocks airdrops, NFTs, and access to higher-value tasks.',
      visual: <PointsXpBasicsVisual />,
    },
    {
      title: 'Earning Points',
      description:
        'Complete bounty tasks, post organic content, and let the community engage with your posts. Daily and weekly quests also reward points. Organic posts earn bonus points when others like and comment.',
      visual: <EarningPointsVisual />,
    },
    {
      title: 'Spending Points',
      description:
        'Creating non-organic posts costs points (keeping the feed spam-free). You can also promote your posts for extra visibility — promoted posts get highlighted and earn bonus rewards from engagement.',
      visual: <SpendingPointsVisual />,
    },
    {
      title: 'Organic Posts — Free & Rewarding',
      description:
        'Posts about Organic DAO get 3 free per week and earn bonus rewards. Toggle "Organic-related" in the composer. The community can flag posts that aren\'t truly organic — 3 flags removes the bonus.',
      visual: <OrganicPostsVisual />,
    },
    {
      title: 'Getting Started',
      description:
        'New to the community? Start with free organic posts, engage with others, and check the quests page. Your first task bounty will give you enough points to start creating paid content and promoting posts.',
      visual: <TipsVisual />,
    },
  ],
};
