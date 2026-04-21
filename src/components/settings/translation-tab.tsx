'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { SettingsField, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization, TranslationSettingsConfig } from '@/features/settings';
import { DEFAULT_TRANSLATION_SETTINGS } from '@/features/settings/schemas';

interface TranslationTabProps {
  org: Organization;
}

type ContentType = keyof TranslationSettingsConfig;
const CONTENT_TYPES: ContentType[] = ['posts', 'proposals', 'ideas', 'tasks', 'comments'];

function ToggleSwitch({
  enabled,
  onToggle,
  ariaLabel,
}: {
  enabled: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        enabled ? 'bg-cta' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function TranslationTab({ org }: TranslationTabProps) {
  const t = useTranslations('Settings');
  const tTrans = useTranslations('Settings.translation');
  const updateOrg = useUpdateOrganization();

  const current: TranslationSettingsConfig =
    org.translation_settings ?? DEFAULT_TRANSLATION_SETTINGS;

  const [flags, setFlags] = useState<TranslationSettingsConfig>(current);

  useEffect(() => {
    setFlags(org.translation_settings ?? DEFAULT_TRANSLATION_SETTINGS);
  }, [org]);

  const dirty = CONTENT_TYPES.some((key) => flags[key] !== current[key]);

  const handleSave = (reason: string) => {
    updateOrg.mutate({ reason, translation_settings: flags });
  };

  const handleReset = () => {
    setFlags(current);
  };

  const toggle = (key: ContentType) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div data-testid="settings-translation-tab">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.translation')}</h2>
      <p className="text-sm text-gray-500 mb-4">{tTrans('description')}</p>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {tTrans('quotaNotice')}{' '}
          <a
            href="https://www.deepl.com/account/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-amber-400 underline-offset-2 hover:text-amber-700"
          >
            {tTrans('quotaNoticeLinkLabel')}
          </a>
        </p>
      </div>

      {CONTENT_TYPES.map((key) => (
        <SettingsField
          key={key}
          label={tTrans(`${key}.label`)}
          description={tTrans(`${key}.description`)}
        >
          <ToggleSwitch
            enabled={flags[key]}
            onToggle={() => toggle(key)}
            ariaLabel={tTrans(`${key}.label`)}
          />
        </SettingsField>
      ))}

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
