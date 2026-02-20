'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization } from '@/features/settings';

interface SprintsTabProps {
  org: Organization;
}

export function SprintsTab({ org }: SprintsTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const sprintPolicy = {
    dispute_window_hours: org.sprint_policy?.dispute_window_hours ?? 48,
    reviewer_sla_hours: org.sprint_policy?.reviewer_sla_hours ?? 72,
    reviewer_sla_extension_hours: org.sprint_policy?.reviewer_sla_extension_hours ?? 24,
  };

  const [capacity, setCapacity] = useState(String(org.default_sprint_capacity));
  const [duration, setDuration] = useState(String(org.default_sprint_duration_days));
  const [threshold, setThreshold] = useState(String(org.organic_id_threshold ?? 0));
  const [disputeWindowHours, setDisputeWindowHours] = useState(String(sprintPolicy.dispute_window_hours));
  const [reviewerSlaHours, setReviewerSlaHours] = useState(String(sprintPolicy.reviewer_sla_hours));
  const [reviewerSlaExtensionHours, setReviewerSlaExtensionHours] = useState(
    String(sprintPolicy.reviewer_sla_extension_hours)
  );

  useEffect(() => {
    setCapacity(String(org.default_sprint_capacity));
    setDuration(String(org.default_sprint_duration_days));
    setThreshold(String(org.organic_id_threshold ?? 0));
    setDisputeWindowHours(String(sprintPolicy.dispute_window_hours));
    setReviewerSlaHours(String(sprintPolicy.reviewer_sla_hours));
    setReviewerSlaExtensionHours(String(sprintPolicy.reviewer_sla_extension_hours));
  }, [
    org,
    sprintPolicy.dispute_window_hours,
    sprintPolicy.reviewer_sla_hours,
    sprintPolicy.reviewer_sla_extension_hours,
  ]);

  const dirty =
    capacity !== String(org.default_sprint_capacity) ||
    duration !== String(org.default_sprint_duration_days) ||
    threshold !== String(org.organic_id_threshold ?? 0) ||
    disputeWindowHours !== String(sprintPolicy.dispute_window_hours) ||
    reviewerSlaHours !== String(sprintPolicy.reviewer_sla_hours) ||
    reviewerSlaExtensionHours !== String(sprintPolicy.reviewer_sla_extension_hours);

  const handleSave = (reason: string) => {
    updateOrg.mutate({
      reason,
      default_sprint_capacity: Number(capacity),
      default_sprint_duration_days: Number(duration),
      organic_id_threshold: Number(threshold) || null,
      sprint_policy: {
        dispute_window_hours: Number(disputeWindowHours),
        reviewer_sla_hours: Number(reviewerSlaHours),
        reviewer_sla_extension_hours: Number(reviewerSlaExtensionHours),
      },
    });
  };

  const handleReset = () => {
    setCapacity(String(org.default_sprint_capacity));
    setDuration(String(org.default_sprint_duration_days));
    setThreshold(String(org.organic_id_threshold ?? 0));
    setDisputeWindowHours(String(sprintPolicy.dispute_window_hours));
    setReviewerSlaHours(String(sprintPolicy.reviewer_sla_hours));
    setReviewerSlaExtensionHours(String(sprintPolicy.reviewer_sla_extension_hours));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.sprints')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('sprints.description')}</p>

      <SettingsField label={t('sprints.capacity')} description={t('sprints.capacityDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            min={1}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('sprints.points')}</span>
        </div>
      </SettingsField>

      <SettingsField label={t('sprints.duration')} description={t('sprints.durationDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={1}
            max={90}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('sprints.days')}</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('sprints.organicIdThreshold')}
        description={t('sprints.organicIdThresholdDescription')}
      >
        <SettingsInput
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          min={0}
          className="w-32"
        />
      </SettingsField>

      <SettingsField
        label={t('sprints.disputeWindowHours')}
        description={t('sprints.disputeWindowHoursDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={disputeWindowHours}
            onChange={(e) => setDisputeWindowHours(e.target.value)}
            min={1}
            max={168}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('governance.hours')}</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('sprints.reviewerSlaHours')}
        description={t('sprints.reviewerSlaHoursDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={reviewerSlaHours}
            onChange={(e) => setReviewerSlaHours(e.target.value)}
            min={1}
            max={168}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('governance.hours')}</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('sprints.reviewerSlaExtensionHours')}
        description={t('sprints.reviewerSlaExtensionHoursDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={reviewerSlaExtensionHours}
            onChange={(e) => setReviewerSlaExtensionHours(e.target.value)}
            min={1}
            max={168}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('governance.hours')}</span>
        </div>
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
