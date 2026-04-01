import type { PageGuide } from './types';

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/15 bg-white/10 backdrop-blur p-3 ${className}`}>
      {children}
    </div>
  );
}

function HowBoostsWorkVisual() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">How Boosts Work</p>
        <div className="space-y-1.5">
          {[
            { step: '1', text: 'Paste a tweet URL you want to boost', icon: '🔗' },
            { step: '2', text: 'Set points to offer as reward', icon: '🪙' },
            { step: '3', text: 'Members engage and submit proof', icon: '🤝' },
            { step: '4', text: 'Points paid out to verified engagers', icon: '✅' },
          ].map(({ step, text, icon }) => (
            <div key={step} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
              <span className="text-xs">{icon}</span>
              <span className="text-[10px] text-white">{text}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function EngagementTypesVisual() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <GlassCard>
        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Engagement Types</p>
        <div className="space-y-1.5">
          {[
            { type: 'Like', desc: 'Like the boosted tweet', icon: '❤️' },
            { type: 'Retweet', desc: 'Retweet to your audience', icon: '🔁' },
            { type: 'Comment', desc: 'Leave a thoughtful reply', icon: '💬' },
          ].map(({ type, desc, icon }) => (
            <div key={type} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{icon}</span>
                <span className="text-[10px] text-white">{type}</span>
              </div>
              <span className="text-[9px] text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export const guide: PageGuide = {
  title: 'Engagement Marketplace',
  i18nSection: 'Marketplace',
  steps: [
    {
      title: 'Boost Your Tweets',
      description:
        'The Engagement Marketplace lets you spend points to boost your tweets. Other members earn points by engaging with your content — likes, retweets, and comments. Points are held in escrow and paid out when engagement is verified.',
      visual: <HowBoostsWorkVisual />,
    },
    {
      title: 'Earning by Engaging',
      description:
        'Browse active boosts and engage with tweets to earn points. Submit proof of your engagement (like, retweet, or comment) and receive points once verified. The more you engage, the more you earn.',
      visual: <EngagementTypesVisual />,
    },
  ],
};
