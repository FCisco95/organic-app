'use client';

import { ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDonationHistory } from '@/features/donations/hooks';
import { DonorBadge } from './donor-badge';
import type { Donation, DonationStatus } from '@/features/donations/types';

const STATUS_CONFIG: Record<DonationStatus, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: 'Pending', className: 'text-yellow-500' },
  verified: { icon: CheckCircle, label: 'Verified', className: 'text-green-500' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-red-500' },
};

function formatAmount(amount: number, token: string): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateSig(sig: string): string {
  return `${sig.slice(0, 8)}…${sig.slice(-6)}`;
}

function DonationRow({ donation }: { donation: Donation }) {
  const statusConfig = STATUS_CONFIG[donation.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatAmount(donation.amount, donation.token)}</span>
          {donation.amount_usd != null && (
            <span className="text-xs text-muted-foreground">
              ≈ ${donation.amount_usd.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(donation.created_at)}</span>
          <a
            href={`https://explorer.solana.com/tx/${donation.tx_signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 hover:text-foreground"
          >
            {truncateSig(donation.tx_signature)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <div className={cn('flex items-center gap-1 text-sm', statusConfig.className)}>
        <StatusIcon className="h-4 w-4" />
        <span>{statusConfig.label}</span>
      </div>
    </div>
  );
}

export function DonationHistory() {
  const { data, isLoading, error } = useDonationHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load donation history.</p>;
  }

  if (!data || data.donations.length === 0) {
    return <p className="text-sm text-muted-foreground">No donations yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Donations</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Total: ${data.total_donated_usd.toFixed(2)}
          </span>
          <DonorBadge cumulativeUsd={data.total_donated_usd} size="sm" />
        </div>
      </div>

      <div className="space-y-2">
        {data.donations.map((donation) => (
          <DonationRow key={donation.id} donation={donation} />
        ))}
      </div>
    </div>
  );
}
