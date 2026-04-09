'use client';

import { AlertTriangle, Ban, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/context';

type RestrictionStatus = 'warned' | 'restricted' | 'banned';

const config: Record<
  RestrictionStatus,
  { icon: typeof AlertTriangle; bg: string; border: string; text: string; label: string }
> = {
  warned: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-200',
    label: 'Warning',
  },
  restricted: {
    icon: ShieldAlert,
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-200',
    label: 'Account Restricted',
  },
  banned: {
    icon: Ban,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-200',
    label: 'Account Banned',
  },
};

const messages: Record<RestrictionStatus, string> = {
  warned:
    'Your account has received a warning. Continued violations may result in restricted access.',
  restricted:
    'Your account has been restricted. You cannot post, comment, or like content.',
  banned:
    'Your account has been banned. All write access has been revoked.',
};

export function RestrictionBanner() {
  const { profile } = useAuth();

  const status = profile?.restriction_status as RestrictionStatus | 'active' | undefined;

  if (!status || status === 'active') return null;

  const c = config[status];
  if (!c) return null;

  const Icon = c.icon;
  const reason = profile?.restriction_reason;

  return (
    <div
      className={`${c.bg} ${c.border} border-b px-4 py-3`}
      role="alert"
      data-testid="restriction-banner"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.text}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${c.text}`}>{c.label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {messages[status]}
            {reason && (
              <span className="mt-1 block text-xs text-muted-foreground/70">
                Reason: {reason}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
