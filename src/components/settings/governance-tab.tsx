'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { VotingConfig } from '@/features/settings';

interface GovernanceTabProps {
  votingConfig: VotingConfig | null;
}

export function GovernanceTab({ votingConfig }: GovernanceTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const defaults = {
    quorum_percentage: 5,
    approval_threshold: 50,
    voting_duration_days: 5,
    proposal_threshold_org: 0,
    proposer_cooldown_days: 7,
    max_live_proposals: 1,
    abstain_counts_toward_quorum: true,
  };

  const vc = votingConfig ?? defaults;

  const [quorum, setQuorum] = useState(String(vc.quorum_percentage));
  const [approval, setApproval] = useState(String(vc.approval_threshold));
  const [duration, setDuration] = useState(String(vc.voting_duration_days));
  const [threshold, setThreshold] = useState(String(vc.proposal_threshold_org));
  const [cooldown, setCooldown] = useState(String(vc.proposer_cooldown_days));
  const [maxLive, setMaxLive] = useState(String(vc.max_live_proposals));
  const [abstainQuorum, setAbstainQuorum] = useState(vc.abstain_counts_toward_quorum);

  useEffect(() => {
    setQuorum(String(vc.quorum_percentage));
    setApproval(String(vc.approval_threshold));
    setDuration(String(vc.voting_duration_days));
    setThreshold(String(vc.proposal_threshold_org));
    setCooldown(String(vc.proposer_cooldown_days));
    setMaxLive(String(vc.max_live_proposals));
    setAbstainQuorum(vc.abstain_counts_toward_quorum);
  }, [votingConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    quorum !== String(vc.quorum_percentage) ||
    approval !== String(vc.approval_threshold) ||
    duration !== String(vc.voting_duration_days) ||
    threshold !== String(vc.proposal_threshold_org) ||
    cooldown !== String(vc.proposer_cooldown_days) ||
    maxLive !== String(vc.max_live_proposals) ||
    abstainQuorum !== vc.abstain_counts_toward_quorum;

  const handleSave = () => {
    updateOrg.mutate({
      quorum_percentage: Number(quorum),
      approval_threshold: Number(approval),
      voting_duration_days: Number(duration),
      proposal_threshold_org: Number(threshold),
      proposer_cooldown_days: Number(cooldown),
      max_live_proposals: Number(maxLive),
      abstain_counts_toward_quorum: abstainQuorum,
    });
  };

  const handleReset = () => {
    setQuorum(String(vc.quorum_percentage));
    setApproval(String(vc.approval_threshold));
    setDuration(String(vc.voting_duration_days));
    setThreshold(String(vc.proposal_threshold_org));
    setCooldown(String(vc.proposer_cooldown_days));
    setMaxLive(String(vc.max_live_proposals));
    setAbstainQuorum(vc.abstain_counts_toward_quorum);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.governance')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('governance.description')}</p>

      <SettingsField label={t('governance.quorum')} description={t('governance.quorumDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={quorum}
            onChange={(e) => setQuorum(e.target.value)}
            min={0}
            max={100}
            className="w-24"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      </SettingsField>

      <SettingsField label={t('governance.approval')} description={t('governance.approvalDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={approval}
            onChange={(e) => setApproval(e.target.value)}
            min={0}
            max={100}
            className="w-24"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      </SettingsField>

      <SettingsField label={t('governance.votingDuration')} description={t('governance.votingDurationDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={1}
            max={90}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('governance.days')}</span>
        </div>
      </SettingsField>

      <SettingsField label={t('governance.proposalThreshold')} description={t('governance.proposalThresholdDescription')}>
        <SettingsInput
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          min={0}
          className="w-32"
        />
      </SettingsField>

      <SettingsField label={t('governance.cooldown')} description={t('governance.cooldownDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
            min={0}
            max={365}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('governance.days')}</span>
        </div>
      </SettingsField>

      <SettingsField label={t('governance.maxLive')} description={t('governance.maxLiveDescription')}>
        <SettingsInput
          type="number"
          value={maxLive}
          onChange={(e) => setMaxLive(e.target.value)}
          min={1}
          max={100}
          className="w-24"
        />
      </SettingsField>

      <SettingsField label={t('governance.abstainQuorum')} description={t('governance.abstainQuorumDescription')}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={abstainQuorum}
            onChange={(e) => setAbstainQuorum(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-organic-orange focus:ring-organic-orange"
          />
          <span className="text-sm text-gray-700">{t('governance.abstainQuorumLabel')}</span>
        </label>
      </SettingsField>

      <SettingsSaveBar
        dirty={dirty}
        saving={updateOrg.isPending}
        onSave={handleSave}
        onReset={handleReset}
        saveLabel={t('save')}
      />
    </div>
  );
}
