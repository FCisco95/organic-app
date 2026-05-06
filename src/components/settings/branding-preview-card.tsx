'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface PreviewSocials {
  x: string | null;
  telegram: string | null;
  discord: string | null;
  youtube: string | null;
  tiktok: string | null;
  website: string | null;
}

interface PreviewBranding {
  name: string;
  communityHandle: string | null;
  tagline: string | null;
  logoUrl: string;
  brandColorPrimary: string;
  socials: PreviewSocials;
}

interface BrandingPreviewCardProps {
  branding: PreviewBranding;
}

const SOCIAL_LABELS: Record<keyof PreviewSocials, string> = {
  x: 'X',
  telegram: 'Telegram',
  discord: 'Discord',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  website: 'Website',
};

export function BrandingPreviewCard({ branding }: BrandingPreviewCardProps) {
  const t = useTranslations('Settings.branding');
  const hasAnySocial = (Object.values(branding.socials) as (string | null)[]).some(
    (value) => value !== null && value !== '',
  );

  return (
    <div
      data-testid="branding-preview"
      className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
      style={{
        backgroundImage: `radial-gradient(circle at top left, hsl(${branding.brandColorPrimary} / 0.18), transparent 60%)`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background"
          style={{
            boxShadow: `0 0 0 1px hsl(${branding.brandColorPrimary} / 0.3)`,
          }}
        >
          <Image
            src={branding.logoUrl}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('previewLabel')}
          </p>
          <h3 className="mt-0.5 truncate text-lg font-semibold text-foreground">
            {branding.name}
          </h3>
          {branding.communityHandle && (
            <p className="text-xs text-muted-foreground">{branding.communityHandle}</p>
          )}
          {branding.tagline ? (
            <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{branding.tagline}</p>
          ) : (
            <p className="mt-2 text-sm italic text-muted-foreground/70">{t('previewNoTagline')}</p>
          )}
        </div>
      </div>

      {hasAnySocial && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {(Object.entries(branding.socials) as [keyof PreviewSocials, string | null][])
            .filter(([, value]) => value !== null && value !== '')
            .map(([key]) => (
              <li
                key={key}
                className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-foreground/80"
              >
                {SOCIAL_LABELS[key]}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
