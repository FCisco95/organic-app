'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization } from '@/features/settings';
import { brandingPatchSchema } from '@/features/branding/schemas';
import { BrandingPreviewCard } from './branding-preview-card';

interface BrandingTabProps {
  org: Organization;
}

type BrandingFormState = {
  community_handle: string;
  tagline: string;
  logo_url: string;
  banner_url: string;
  favicon_url: string;
  og_image_url: string;
  brand_color_primary: string;
  brand_color_secondary: string;
  footer_note: string;
  social_x: string;
  social_telegram: string;
  social_discord: string;
  social_youtube: string;
  social_tiktok: string;
  social_website: string;
};

function fromOrg(org: Organization): BrandingFormState {
  return {
    community_handle: org.community_handle ?? '',
    tagline: org.tagline ?? '',
    logo_url: org.logo_url ?? '',
    banner_url: org.banner_url ?? '',
    favicon_url: org.favicon_url ?? '',
    og_image_url: org.og_image_url ?? '',
    brand_color_primary: org.brand_color_primary ?? '',
    brand_color_secondary: org.brand_color_secondary ?? '',
    footer_note: org.footer_note ?? '',
    social_x: org.social_x ?? '',
    social_telegram: org.social_telegram ?? '',
    social_discord: org.social_discord ?? '',
    social_youtube: org.social_youtube ?? '',
    social_tiktok: org.social_tiktok ?? '',
    social_website: org.social_website ?? '',
  };
}

function nullable(value: string): string | null {
  return value.trim() === '' ? null : value.trim();
}

export function BrandingTab({ org }: BrandingTabProps) {
  const t = useTranslations('Settings');
  const tb = useTranslations('Settings.branding');
  const updateOrg = useUpdateOrganization();

  const initial = useMemo(() => fromOrg(org), [org]);
  const [state, setState] = useState<BrandingFormState>(initial);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setState(initial);
  }, [initial]);

  const dirty = (Object.keys(state) as (keyof BrandingFormState)[]).some(
    (key) => state[key] !== initial[key],
  );

  const setField = (key: keyof BrandingFormState) => (value: string) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  };

  const handleReset = () => {
    setState(initial);
    setValidationError(null);
  };

  const handleSave = (reason: string) => {
    const payload = {
      community_handle: nullable(state.community_handle),
      tagline: nullable(state.tagline),
      logo_url: nullable(state.logo_url),
      banner_url: nullable(state.banner_url),
      favicon_url: nullable(state.favicon_url),
      og_image_url: nullable(state.og_image_url),
      brand_color_primary: nullable(state.brand_color_primary),
      brand_color_secondary: nullable(state.brand_color_secondary),
      footer_note: nullable(state.footer_note),
      social_x: nullable(state.social_x),
      social_telegram: nullable(state.social_telegram),
      social_discord: nullable(state.social_discord),
      social_youtube: nullable(state.social_youtube),
      social_tiktok: nullable(state.social_tiktok),
      social_website: nullable(state.social_website),
    };

    const parsed = brandingPatchSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const path = first?.path.join('.') ?? 'field';
      setValidationError(`${path}: ${first?.message ?? 'invalid value'}`);
      return;
    }

    updateOrg.mutate({ reason, ...parsed.data });
  };

  const previewBranding = {
    name: org.name,
    communityHandle: nullable(state.community_handle),
    tagline: nullable(state.tagline),
    logoUrl: nullable(state.logo_url) ?? '/organic-logo.png',
    brandColorPrimary: nullable(state.brand_color_primary) ?? '28 100% 50%',
    socials: {
      x: nullable(state.social_x),
      telegram: nullable(state.social_telegram),
      discord: nullable(state.social_discord),
      youtube: nullable(state.social_youtube),
      tiktok: nullable(state.social_tiktok),
      website: nullable(state.social_website),
    },
  };

  return (
    <div data-testid="branding-tab">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900">{tb('title')}</h2>
        <a
          href="/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-organic-terracotta hover:text-organic-terracotta-hover"
        >
          {tb('viewPublicPage')}
          <ExternalLink aria-hidden="true" className="w-3 h-3" />
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-5">{tb('description')}</p>

      <BrandingPreviewCard branding={previewBranding} />

      {/* Identity */}
      <section aria-labelledby="branding-identity" className="mt-6">
        <h3 id="branding-identity" className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-2">
          {tb('sectionIdentity')}
        </h3>
        <SettingsField label={tb('handle')} description={tb('handleHelp')}>
          <SettingsInput
            value={state.community_handle}
            onChange={(e) => setField('community_handle')(e.target.value)}
            maxLength={64}
            placeholder="@your_community"
          />
        </SettingsField>
        <SettingsField label={tb('tagline')} description={tb('taglineHelp')}>
          <SettingsInput
            value={state.tagline}
            onChange={(e) => setField('tagline')(e.target.value)}
            maxLength={160}
            placeholder={tb('taglinePlaceholder')}
          />
        </SettingsField>
      </section>

      {/* Visuals */}
      <section aria-labelledby="branding-visuals" className="mt-6">
        <h3 id="branding-visuals" className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-2">
          {tb('sectionVisuals')}
        </h3>
        <SettingsField label={tb('logoUrl')} description={tb('logoUrlHelp')}>
          <SettingsInput
            value={state.logo_url}
            onChange={(e) => setField('logo_url')(e.target.value)}
            placeholder="/your-logo.png"
          />
        </SettingsField>
        <SettingsField label={tb('bannerUrl')} description={tb('bannerUrlHelp')}>
          <SettingsInput
            value={state.banner_url}
            onChange={(e) => setField('banner_url')(e.target.value)}
            placeholder="https://..."
          />
        </SettingsField>
        <SettingsField label={tb('faviconUrl')} description={tb('faviconUrlHelp')}>
          <SettingsInput
            value={state.favicon_url}
            onChange={(e) => setField('favicon_url')(e.target.value)}
            placeholder="/favicon.ico"
          />
        </SettingsField>
        <SettingsField label={tb('brandColorPrimary')} description={tb('brandColorHelp')}>
          <div className="flex items-center gap-2">
            <SettingsInput
              value={state.brand_color_primary}
              onChange={(e) => setField('brand_color_primary')(e.target.value)}
              placeholder="28 100% 50%"
            />
            <div
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-lg border border-border"
              style={{
                backgroundColor: state.brand_color_primary
                  ? `hsl(${state.brand_color_primary})`
                  : 'transparent',
              }}
            />
          </div>
        </SettingsField>
        <SettingsField label={tb('brandColorSecondary')} description={tb('brandColorHelp')}>
          <div className="flex items-center gap-2">
            <SettingsInput
              value={state.brand_color_secondary}
              onChange={(e) => setField('brand_color_secondary')(e.target.value)}
              placeholder="60 100% 60%"
            />
            <div
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-lg border border-border"
              style={{
                backgroundColor: state.brand_color_secondary
                  ? `hsl(${state.brand_color_secondary})`
                  : 'transparent',
              }}
            />
          </div>
        </SettingsField>
      </section>

      {/* Social & Community */}
      <section aria-labelledby="branding-social" className="mt-6">
        <h3 id="branding-social" className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-2">
          {tb('sectionSocial')}
        </h3>
        <p className="text-xs text-gray-500 mb-3">{tb('socialIntro')}</p>
        <SettingsField label="X (Twitter)" description="https://x.com/your-handle">
          <SettingsInput
            value={state.social_x}
            onChange={(e) => setField('social_x')(e.target.value)}
            placeholder="https://x.com/..."
          />
        </SettingsField>
        <SettingsField label="Telegram" description="https://t.me/...">
          <SettingsInput
            value={state.social_telegram}
            onChange={(e) => setField('social_telegram')(e.target.value)}
            placeholder="https://t.me/..."
          />
        </SettingsField>
        <SettingsField label="Discord" description="https://discord.gg/...">
          <SettingsInput
            value={state.social_discord}
            onChange={(e) => setField('social_discord')(e.target.value)}
            placeholder="https://discord.gg/..."
          />
        </SettingsField>
        <SettingsField label="YouTube" description="https://youtube.com/@...">
          <SettingsInput
            value={state.social_youtube}
            onChange={(e) => setField('social_youtube')(e.target.value)}
            placeholder="https://youtube.com/@..."
          />
        </SettingsField>
        <SettingsField label="TikTok" description="https://tiktok.com/@...">
          <SettingsInput
            value={state.social_tiktok}
            onChange={(e) => setField('social_tiktok')(e.target.value)}
            placeholder="https://tiktok.com/@..."
          />
        </SettingsField>
        <SettingsField label={tb('website')} description={tb('websiteHelp')}>
          <SettingsInput
            value={state.social_website}
            onChange={(e) => setField('social_website')(e.target.value)}
            placeholder="https://your-domain.com"
          />
        </SettingsField>
      </section>

      {/* Advanced */}
      <section aria-labelledby="branding-advanced" className="mt-6">
        <h3 id="branding-advanced" className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-2">
          {tb('sectionAdvanced')}
        </h3>
        <SettingsField label={tb('ogImageUrl')} description={tb('ogImageUrlHelp')}>
          <SettingsInput
            value={state.og_image_url}
            onChange={(e) => setField('og_image_url')(e.target.value)}
            placeholder="/og-image.png"
          />
        </SettingsField>
        <SettingsField label={tb('footerNote')} description={tb('footerNoteHelp')}>
          <textarea
            value={state.footer_note}
            onChange={(e) => setField('footer_note')(e.target.value)}
            maxLength={280}
            rows={2}
            className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 focus:border-organic-terracotta resize-none"
          />
        </SettingsField>
      </section>

      {validationError && (
        <p role="alert" className="mt-4 text-sm text-red-600" data-testid="branding-validation-error">
          {validationError}
        </p>
      )}

      <SettingsSaveBar
        dirty={dirty}
        saving={updateOrg.isPending}
        onSave={handleSave}
        onReset={handleReset}
        saveLabel={t('save')}
        reasonLabel={t('auditReasonLabel')}
        reasonPlaceholder={t('auditReasonPlaceholder')}
        reasonHelp={t('auditReasonHelp')}
      />
    </div>
  );
}
