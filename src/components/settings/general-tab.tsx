'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization } from '@/features/settings';

interface GeneralTabProps {
  org: Organization;
}

export function GeneralTab({ org }: GeneralTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? '');

  useEffect(() => {
    setName(org.name);
    setDescription(org.description ?? '');
  }, [org]);

  const dirty = name !== org.name || description !== (org.description ?? '');

  const handleSave = (reason: string) => {
    updateOrg.mutate({ reason, name, description: description || null });
  };

  const handleReset = () => {
    setName(org.name);
    setDescription(org.description ?? '');
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.general')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('general.description')}</p>

      <SettingsField label={t('general.name')} description={t('general.nameDescription')}>
        <SettingsInput value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </SettingsField>

      <SettingsField
        label={t('general.orgDescription')}
        description={t('general.orgDescriptionHelp')}
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange resize-none"
        />
      </SettingsField>

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
