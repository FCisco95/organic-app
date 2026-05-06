'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Copy, Check } from 'lucide-react';

interface CopyAddressButtonProps {
  /** Full Solana mint / contract address. */
  address: string;
  /** Optional override of the truncation lengths. Defaults to 6 + 6. */
  prefix?: number;
  suffix?: number;
  /** Optional className applied to the outer button. */
  className?: string;
}

const COPY_RESET_MS = 1500;

function truncate(address: string, prefix: number, suffix: number): string {
  if (address.length <= prefix + suffix + 1) return address;
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
}

export function CopyAddressButton({
  address,
  prefix = 6,
  suffix = 6,
  className,
}: CopyAddressButtonProps) {
  const t = useTranslations('Dashboard.copyAddress');
  const [copied, setCopied] = useState(false);
  const truncated = truncate(address, prefix, suffix);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(t('copiedToast', { address: truncated }), {
        duration: 2500,
      });
      window.setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t('ariaLabel', { address: truncated })}
      data-testid="copy-address-button"
      className={`group inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 font-mono text-sm text-foreground/90 transition-colors hover:border-organic-terracotta/40 hover:bg-organic-terracotta/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-organic-terracotta/40 focus-visible:ring-offset-2 motion-reduce:transition-none ${className ?? ''}`}
    >
      <span aria-hidden="true">{truncated}</span>
      {copied ? (
        <Check
          aria-hidden="true"
          className="h-3.5 w-3.5 text-emerald-600"
        />
      ) : (
        <Copy
          aria-hidden="true"
          className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-organic-terracotta motion-reduce:transition-none"
        />
      )}
    </button>
  );
}
