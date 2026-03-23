import { Heart, Repeat2, MessageCircle } from 'lucide-react';

export function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export const engagementIcons: Record<string, React.ElementType> = {
  like: Heart,
  retweet: Repeat2,
  comment: MessageCircle,
};

export const engagementColors: Record<string, string> = {
  like: 'bg-rose-50 text-rose-700 border-rose-200',
  retweet: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  comment: 'bg-sky-50 text-sky-700 border-sky-200',
};
