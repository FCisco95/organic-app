'use client';

import { useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { BrandIcon, type BrandPlatform } from '@/components/ui/brand-icon';
import type { TenantSocials } from '@/lib/tenant/types';

interface SocialIconRowProps {
  socials: TenantSocials;
  /** Community name used to compose accessible labels: "Follow {Community} on X". */
  communityName: string;
  className?: string;
}

interface PlatformDef {
  key: keyof TenantSocials;
  label: string;
  brand: BrandPlatform | 'website';
}

/**
 * Display order: X first (crypto discovery), then Telegram, Discord, YouTube,
 * TikTok last as the optional channel, then website. Per-platform decision
 * documented in the dashboard plan.
 */
const PLATFORMS: PlatformDef[] = [
  { key: 'x', label: 'X (Twitter)', brand: 'x' },
  { key: 'telegram', label: 'Telegram', brand: 'telegram' },
  { key: 'discord', label: 'Discord', brand: 'discord' },
  { key: 'youtube', label: 'YouTube', brand: 'youtube' },
  { key: 'tiktok', label: 'TikTok', brand: 'tiktok' },
  { key: 'website', label: 'Website', brand: 'website' },
];

export function SocialIconRow({ socials, communityName, className }: SocialIconRowProps) {
  const t = useTranslations('Dashboard.identityTile');

  const configured = PLATFORMS.filter((p) => {
    const url = socials[p.key];
    return typeof url === 'string' && url.length > 0;
  });

  if (configured.length === 0) return null;

  return (
    <ul
      role="list"
      data-testid="social-icon-row"
      className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}
    >
      {configured.map(({ key, label, brand }) => {
        const url = socials[key] as string;
        const ariaLabel = t('followOn', { community: communityName, platform: label });
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ariaLabel}
              className="group inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 transition-all hover:-translate-y-0.5 hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-organic-terracotta/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:h-9 sm:w-9"
            >
              {brand === 'website' ? (
                <Globe aria-hidden="true" className="h-[18px] w-[18px]" />
              ) : (
                <BrandIcon platform={brand} className="h-[18px] w-[18px]" />
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
