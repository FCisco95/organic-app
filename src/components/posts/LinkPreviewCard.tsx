'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewCardProps {
  url: string;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  compact?: boolean;
  className?: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function isTwitterUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname === 'twitter.com' || hostname === 'x.com';
  } catch {
    return false;
  }
}

export function LinkPreviewCard({
  url,
  ogTitle,
  ogDescription,
  ogImageUrl,
  compact = false,
  className,
}: LinkPreviewCardProps) {
  const domain = extractDomain(url);
  const isX = isTwitterUrl(url);
  const hasOgData = ogTitle || ogDescription || ogImageUrl;

  if (!hasOgData) {
    // Minimal link pill — no OG data available
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground',
          'border border-border rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/50',
          className,
        )}
      >
        {isX ? (
          <span className="font-bold text-[13px] leading-none" style={{ fontFamily: 'serif' }}>
            &#120143;
          </span>
        ) : (
          <ExternalLink className="w-3 h-3 shrink-0" />
        )}
        <span className="truncate max-w-[200px]">{domain}</span>
      </a>
    );
  }

  if (compact) {
    // Compact variant for regular feed cards — single row
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex items-center gap-2.5 rounded-lg border border-border overflow-hidden',
          'transition-all hover:bg-muted/30 hover:border-border/80',
          className,
        )}
      >
        {ogImageUrl && (
          <div className="w-16 h-16 shrink-0 bg-muted overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0 py-2 pr-2.5">
          {ogTitle && (
            <p className="text-xs font-medium text-foreground truncate">{ogTitle}</p>
          )}
          {ogDescription && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{ogDescription}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
            {isX ? (
              <span className="font-bold text-[11px] leading-none" style={{ fontFamily: 'serif' }}>
                &#120143;
              </span>
            ) : (
              <ExternalLink className="w-2.5 h-2.5" />
            )}
            {domain}
          </p>
        </div>
      </a>
    );
  }

  // Full variant for featured cards and detail page
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'block rounded-xl border border-border overflow-hidden',
        'transition-all hover:bg-muted/30 hover:border-border/80 hover:shadow-sm',
        className,
      )}
    >
      {ogImageUrl && (
        <div className="w-full h-40 sm:h-48 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogImageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        {ogTitle && (
          <p className="text-sm font-medium text-foreground line-clamp-2">{ogTitle}</p>
        )}
        {ogDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ogDescription}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
          {isX ? (
            <span className="font-bold text-[12px] leading-none" style={{ fontFamily: 'serif' }}>
              &#120143;
            </span>
          ) : (
            <ExternalLink className="w-3 h-3" />
          )}
          {domain}
        </p>
      </div>
    </a>
  );
}
