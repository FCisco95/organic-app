'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import {
  useAdminQuests,
  useCreateQuest,
  useUpdateQuest,
  useDeleteQuest,
  useUpdateGamificationConfig,
} from '@/features/gamification/hooks';
import type { QuestDefinitionRow, GamificationConfig } from '@/features/gamification/types';
import type { Organization } from '@/features/settings';
import toast from 'react-hot-toast';

interface GamificationTabProps {
  org: Organization;
}

const DEFAULT_GAMIFICATION_CONFIG: GamificationConfig = {
  enabled: true,
  xp_per_task_point: 10,
  xp_vote_cast: 15,
  xp_proposal_created: 50,
  xp_comment_created: 5,
  leveling_mode: 'auto',
  burn_cost_multiplier: 1.0,
  referral_enabled: true,
  referral_xp_per_signup: 100,
  referral_point_share_percent: 5,
  referral_share_duration_days: 30,
  referral_tiers: [],
};

export function GamificationTab({ org }: GamificationTabProps) {
  const t = useTranslations('Settings');
  const tAdmin = useTranslations('GamificationAdmin');

  const config: GamificationConfig = {
    ...DEFAULT_GAMIFICATION_CONFIG,
    ...((org as unknown as Record<string, unknown>).gamification_config as Partial<GamificationConfig> ?? {}),
  };

  // Quest management
  const { data: quests, isLoading: questsLoading } = useAdminQuests();
  const createQuestMutation = useCreateQuest();
  const updateQuestMutation = useUpdateQuest();
  const deleteQuestMutation = useDeleteQuest();
  const updateConfigMutation = useUpdateGamificationConfig();

  // Section collapse
  const [questsOpen, setQuestsOpen] = useState(true);
  const [xpOpen, setXpOpen] = useState(false);
  const [levelingOpen, setLevelingOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  // Config form state
  const [xpPerTask, setXpPerTask] = useState(String(config.xp_per_task_point));
  const [xpVote, setXpVote] = useState(String(config.xp_vote_cast));
  const [xpProposal, setXpProposal] = useState(String(config.xp_proposal_created));
  const [xpComment, setXpComment] = useState(String(config.xp_comment_created));
  const [levelingMode, setLevelingMode] = useState<'auto' | 'manual_burn'>(config.leveling_mode);
  const [burnMultiplier, setBurnMultiplier] = useState(String(config.burn_cost_multiplier));
  const [referralEnabled, setReferralEnabled] = useState(config.referral_enabled);
  const [referralXp, setReferralXp] = useState(String(config.referral_xp_per_signup));
  const [referralSharePercent, setReferralSharePercent] = useState(String(config.referral_point_share_percent));
  const [referralDuration, setReferralDuration] = useState(String(config.referral_share_duration_days));

  // Quest creation form
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [editingQuest, setEditingQuest] = useState<QuestDefinitionRow | null>(null);
  const [questForm, setQuestForm] = useState({
    title: '',
    description: '',
    cadence: 'daily' as const,
    metric_type: 'daily_tasks_completed',
    target_value: '1',
    unit: '',
    xp_reward: '0',
    points_reward: '0',
    icon: '🎯',
    sort_order: '100',
  });

  useEffect(() => {
    const c: GamificationConfig = {
      ...DEFAULT_GAMIFICATION_CONFIG,
      ...((org as unknown as Record<string, unknown>).gamification_config as Partial<GamificationConfig> ?? {}),
    };
    setXpPerTask(String(c.xp_per_task_point));
    setXpVote(String(c.xp_vote_cast));
    setXpProposal(String(c.xp_proposal_created));
    setXpComment(String(c.xp_comment_created));
    setLevelingMode(c.leveling_mode);
    setBurnMultiplier(String(c.burn_cost_multiplier));
    setReferralEnabled(c.referral_enabled);
    setReferralXp(String(c.referral_xp_per_signup));
    setReferralSharePercent(String(c.referral_point_share_percent));
    setReferralDuration(String(c.referral_share_duration_days));
  }, [org]);

  const configDirty =
    xpPerTask !== String(config.xp_per_task_point) ||
    xpVote !== String(config.xp_vote_cast) ||
    xpProposal !== String(config.xp_proposal_created) ||
    xpComment !== String(config.xp_comment_created) ||
    levelingMode !== config.leveling_mode ||
    burnMultiplier !== String(config.burn_cost_multiplier) ||
    referralEnabled !== config.referral_enabled ||
    referralXp !== String(config.referral_xp_per_signup) ||
    referralSharePercent !== String(config.referral_point_share_percent) ||
    referralDuration !== String(config.referral_share_duration_days);

  const handleConfigSave = (reason: string) => {
    updateConfigMutation.mutate(
      {
        reason,
        xp_per_task_point: Number(xpPerTask),
        xp_vote_cast: Number(xpVote),
        xp_proposal_created: Number(xpProposal),
        xp_comment_created: Number(xpComment),
        leveling_mode: levelingMode,
        burn_cost_multiplier: Number(burnMultiplier),
        referral_enabled: referralEnabled,
        referral_xp_per_signup: Number(referralXp),
        referral_point_share_percent: Number(referralSharePercent),
        referral_share_duration_days: Number(referralDuration),
      },
      {
        onSuccess: () => toast.success(tAdmin('configSaved')),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleConfigReset = () => {
    setXpPerTask(String(config.xp_per_task_point));
    setXpVote(String(config.xp_vote_cast));
    setXpProposal(String(config.xp_proposal_created));
    setXpComment(String(config.xp_comment_created));
    setLevelingMode(config.leveling_mode);
    setBurnMultiplier(String(config.burn_cost_multiplier));
    setReferralEnabled(config.referral_enabled);
    setReferralXp(String(config.referral_xp_per_signup));
    setReferralSharePercent(String(config.referral_point_share_percent));
    setReferralDuration(String(config.referral_share_duration_days));
  };

  const handleCreateQuest = async () => {
    try {
      await createQuestMutation.mutateAsync({
        title: questForm.title,
        description: questForm.description,
        cadence: questForm.cadence,
        metric_type: questForm.metric_type,
        target_value: Number(questForm.target_value),
        unit: questForm.unit,
        xp_reward: Number(questForm.xp_reward),
        points_reward: Number(questForm.points_reward),
        icon: questForm.icon,
        sort_order: Number(questForm.sort_order),
      });
      toast.success(tAdmin('questCreated'));
      setShowQuestForm(false);
      resetQuestForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tAdmin('questCreateFailed'));
    }
  };

  const handleUpdateQuest = async () => {
    if (!editingQuest) return;
    try {
      await updateQuestMutation.mutateAsync({
        id: editingQuest.id,
        title: questForm.title,
        description: questForm.description,
        cadence: questForm.cadence,
        metric_type: questForm.metric_type,
        target_value: Number(questForm.target_value),
        unit: questForm.unit,
        xp_reward: Number(questForm.xp_reward),
        points_reward: Number(questForm.points_reward),
        icon: questForm.icon,
        sort_order: Number(questForm.sort_order),
      });
      toast.success(tAdmin('questUpdated'));
      setEditingQuest(null);
      setShowQuestForm(false);
      resetQuestForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tAdmin('questUpdateFailed'));
    }
  };

  const handleDeleteQuest = async (id: string) => {
    try {
      await deleteQuestMutation.mutateAsync(id);
      toast.success(tAdmin('questDeleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tAdmin('questDeleteFailed'));
    }
  };

  const resetQuestForm = () => {
    setQuestForm({
      title: '',
      description: '',
      cadence: 'daily',
      metric_type: 'daily_tasks_completed',
      target_value: '1',
      unit: '',
      xp_reward: '0',
      points_reward: '0',
      icon: '🎯',
      sort_order: '100',
    });
  };

  const startEditQuest = (quest: QuestDefinitionRow) => {
    setEditingQuest(quest);
    setQuestForm({
      title: quest.title,
      description: quest.description,
      cadence: quest.cadence as 'daily',
      metric_type: quest.metric_type,
      target_value: String(quest.target_value),
      unit: quest.unit,
      xp_reward: String(quest.xp_reward),
      points_reward: String(quest.points_reward),
      icon: quest.icon,
      sort_order: String(quest.sort_order),
    });
    setShowQuestForm(true);
  };

  const SectionHeader = ({
    title,
    open,
    onToggle,
  }: {
    title: string;
    open: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-3 text-left"
    >
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {open ? (
        <ChevronUp className="h-4 w-4 text-gray-400" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.gamification')}</h2>
      <p className="text-sm text-gray-500 mb-6">{tAdmin('description')}</p>

      {/* 1. Quest Management */}
      <div className="border-b border-gray-100">
        <SectionHeader title={tAdmin('questManagement')} open={questsOpen} onToggle={() => setQuestsOpen(!questsOpen)} />
        {questsOpen && (
          <div className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">{tAdmin('questManagementDescription')}</p>
              <button
                onClick={() => {
                  resetQuestForm();
                  setEditingQuest(null);
                  setShowQuestForm(!showQuestForm);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-organic-orange border border-orange-200 rounded-lg hover:bg-orange-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {tAdmin('addQuest')}
              </button>
            </div>

            {/* Quest Form */}
            {showQuestForm && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questTitle')}</label>
                    <SettingsInput value={questForm.title} onChange={(e) => setQuestForm({ ...questForm, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questIcon')}</label>
                    <SettingsInput value={questForm.icon} onChange={(e) => setQuestForm({ ...questForm, icon: e.target.value })} className="w-16" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">{tAdmin('questDescription')}</label>
                  <SettingsInput value={questForm.description} onChange={(e) => setQuestForm({ ...questForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questCadence')}</label>
                    <select
                      value={questForm.cadence}
                      onChange={(e) => setQuestForm({ ...questForm, cadence: e.target.value as 'daily' })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="long_term">Long-term</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questMetric')}</label>
                    <SettingsInput value={questForm.metric_type} onChange={(e) => setQuestForm({ ...questForm, metric_type: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questTarget')}</label>
                    <SettingsInput type="number" value={questForm.target_value} onChange={(e) => setQuestForm({ ...questForm, target_value: e.target.value })} min={1} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questXpReward')}</label>
                    <SettingsInput type="number" value={questForm.xp_reward} onChange={(e) => setQuestForm({ ...questForm, xp_reward: e.target.value })} min={0} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questPointsReward')}</label>
                    <SettingsInput type="number" value={questForm.points_reward} onChange={(e) => setQuestForm({ ...questForm, points_reward: e.target.value })} min={0} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{tAdmin('questSortOrder')}</label>
                    <SettingsInput type="number" value={questForm.sort_order} onChange={(e) => setQuestForm({ ...questForm, sort_order: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={editingQuest ? handleUpdateQuest : handleCreateQuest}
                    disabled={!questForm.title || createQuestMutation.isPending || updateQuestMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-organic-orange hover:bg-orange-600 rounded-lg disabled:opacity-50"
                  >
                    {editingQuest ? tAdmin('updateQuest') : tAdmin('createQuest')}
                  </button>
                  <button
                    onClick={() => { setShowQuestForm(false); setEditingQuest(null); resetQuestForm(); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    {tAdmin('cancelAction')}
                  </button>
                </div>
              </div>
            )}

            {/* Quest List */}
            {questsLoading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {(quests ?? []).map((quest) => (
                  <div
                    key={quest.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-sm ${
                      quest.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{quest.icon}</span>
                      <span className="font-medium text-gray-900 truncate">{quest.title}</span>
                      <span className="text-xs text-gray-400 capitalize">{quest.cadence}</span>
                      {!quest.is_active && (
                        <span className="text-xs text-red-400">{tAdmin('inactive')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditQuest(quest)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                        title={tAdmin('editQuest')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuest(quest.id)}
                        disabled={deleteQuestMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded disabled:opacity-50"
                        title={tAdmin('deleteQuest')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. XP Configuration */}
      <div className="border-b border-gray-100">
        <SectionHeader title={tAdmin('xpConfiguration')} open={xpOpen} onToggle={() => setXpOpen(!xpOpen)} />
        {xpOpen && (
          <div className="pb-4">
            <SettingsField label={tAdmin('xpPerTaskPoint')} description={tAdmin('xpPerTaskPointDescription')}>
              <SettingsInput type="number" value={xpPerTask} onChange={(e) => setXpPerTask(e.target.value)} min={1} className="w-28" />
            </SettingsField>
            <SettingsField label={tAdmin('xpVoteCast')} description={tAdmin('xpVoteCastDescription')}>
              <SettingsInput type="number" value={xpVote} onChange={(e) => setXpVote(e.target.value)} min={0} className="w-28" />
            </SettingsField>
            <SettingsField label={tAdmin('xpProposalCreated')} description={tAdmin('xpProposalCreatedDescription')}>
              <SettingsInput type="number" value={xpProposal} onChange={(e) => setXpProposal(e.target.value)} min={0} className="w-28" />
            </SettingsField>
            <SettingsField label={tAdmin('xpCommentCreated')} description={tAdmin('xpCommentCreatedDescription')}>
              <SettingsInput type="number" value={xpComment} onChange={(e) => setXpComment(e.target.value)} min={0} className="w-28" />
            </SettingsField>
          </div>
        )}
      </div>

      {/* 3. Leveling Mode */}
      <div className="border-b border-gray-100">
        <SectionHeader title={tAdmin('levelingMode')} open={levelingOpen} onToggle={() => setLevelingOpen(!levelingOpen)} />
        {levelingOpen && (
          <div className="pb-4">
            <SettingsField label={tAdmin('levelingModeLabel')} description={tAdmin('levelingModeDescription')}>
              <select
                value={levelingMode}
                onChange={(e) => setLevelingMode(e.target.value as 'auto' | 'manual_burn')}
                className="w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30"
              >
                <option value="auto">{tAdmin('levelingAuto')}</option>
                <option value="manual_burn">{tAdmin('levelingManualBurn')}</option>
              </select>
            </SettingsField>
            {levelingMode === 'manual_burn' && (
              <SettingsField label={tAdmin('burnCostMultiplier')} description={tAdmin('burnCostMultiplierDescription')}>
                <SettingsInput type="number" value={burnMultiplier} onChange={(e) => setBurnMultiplier(e.target.value)} min={0.1} step={0.1} className="w-28" />
              </SettingsField>
            )}
          </div>
        )}
      </div>

      {/* 4. Referral Settings */}
      <div>
        <SectionHeader title={tAdmin('referralSettings')} open={referralOpen} onToggle={() => setReferralOpen(!referralOpen)} />
        {referralOpen && (
          <div className="pb-4">
            <SettingsField label={tAdmin('referralEnabled')} description={tAdmin('referralEnabledDescription')}>
              <button
                onClick={() => setReferralEnabled(!referralEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  referralEnabled ? 'bg-organic-orange' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    referralEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </SettingsField>
            <SettingsField label={tAdmin('referralXpPerSignup')} description={tAdmin('referralXpPerSignupDescription')}>
              <SettingsInput type="number" value={referralXp} onChange={(e) => setReferralXp(e.target.value)} min={0} className="w-28" />
            </SettingsField>
            <SettingsField label={tAdmin('referralSharePercent')} description={tAdmin('referralSharePercentDescription')}>
              <div className="flex items-center gap-2">
                <SettingsInput type="number" value={referralSharePercent} onChange={(e) => setReferralSharePercent(e.target.value)} min={0} max={100} className="w-28" />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </SettingsField>
            <SettingsField label={tAdmin('referralDuration')} description={tAdmin('referralDurationDescription')}>
              <div className="flex items-center gap-2">
                <SettingsInput type="number" value={referralDuration} onChange={(e) => setReferralDuration(e.target.value)} min={1} className="w-28" />
                <span className="text-sm text-gray-500">{tAdmin('days')}</span>
              </div>
            </SettingsField>
          </div>
        )}
      </div>

      {/* Save Bar */}
      <SettingsSaveBar
        dirty={configDirty}
        saving={updateConfigMutation.isPending}
        onSave={handleConfigSave}
        onReset={handleConfigReset}
        saveLabel={t('save')}
        reasonLabel={t('auditReasonLabel')}
        reasonPlaceholder={t('auditReasonPlaceholder')}
        reasonHelp={t('auditReasonHelp')}
      />
    </div>
  );
}
