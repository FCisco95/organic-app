'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Egg, Sparkles, Zap } from 'lucide-react';
import {
  useAdminCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
} from '@/features/campaigns';
import type { Campaign } from '@/features/campaigns';
import { useEggHuntConfig, useUpdateEggHuntConfig, useEggHuntStats } from '@/features/easter';
import type { EggHuntConfig, EggHuntStats } from '@/features/easter';
import toast from 'react-hot-toast';

type CampaignFormData = {
  title: string;
  description: string;
  banner_url: string;
  icon: string;
  cta_text: string;
  cta_link: string;
  starts_at: string;
  ends_at: string;
  priority: number;
  is_active: boolean;
  target_audience: 'all' | 'members' | 'new_users' | 'admins';
  visibility_condition: 'always' | 'egg_hunt_revealed';
};

const EMPTY_FORM: CampaignFormData = {
  title: '',
  description: '',
  banner_url: '',
  icon: '',
  cta_text: 'Learn more',
  cta_link: '',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: '',
  priority: 0,
  is_active: true,
  target_audience: 'all',
  visibility_condition: 'always',
};

function campaignToForm(c: Campaign): CampaignFormData {
  return {
    title: c.title,
    description: c.description,
    banner_url: c.banner_url ?? '',
    icon: c.icon ?? '',
    cta_text: c.cta_text ?? 'Learn more',
    cta_link: c.cta_link ?? '',
    starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : '',
    ends_at: c.ends_at ? new Date(c.ends_at).toISOString().slice(0, 16) : '',
    priority: c.priority,
    is_active: c.is_active,
    target_audience: c.target_audience as CampaignFormData['target_audience'],
    visibility_condition: c.visibility_condition as CampaignFormData['visibility_condition'],
  };
}

function formToPayload(form: CampaignFormData) {
  return {
    title: form.title,
    description: form.description,
    banner_url: form.banner_url || null,
    icon: form.icon || null,
    cta_text: form.cta_text || null,
    cta_link: form.cta_link || null,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    priority: form.priority,
    is_active: form.is_active,
    target_audience: form.target_audience,
    visibility_condition: form.visibility_condition,
  };
}

function CampaignForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  isEdit,
}: {
  form: CampaignFormData;
  onChange: (form: CampaignFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const set = <K extends keyof CampaignFormData>(key: K, value: CampaignFormData[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {isEdit ? 'Edit Campaign' : 'New Campaign'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Title *</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={60}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
            placeholder="Launch Week — 2x XP"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Icon/Emoji</label>
          <input
            value={form.icon}
            onChange={(e) => set('icon', e.target.value)}
            maxLength={10}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
            placeholder="🚀"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={300}
          rows={2}
          className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 resize-none"
          placeholder="2x XP on all activities during launch week!"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Banner Image URL</label>
          <input
            value={form.banner_url}
            onChange={(e) => set('banner_url', e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">CTA Link</label>
          <input
            value={form.cta_link}
            onChange={(e) => set('cta_link', e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
            placeholder="/quests or https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">CTA Text</label>
          <input
            value={form.cta_text}
            onChange={(e) => set('cta_text', e.target.value)}
            maxLength={40}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
            placeholder="Learn more"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Priority</label>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => set('priority', parseInt(e.target.value) || 0)}
            min={0}
            max={100}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Audience</label>
          <select
            value={form.target_audience}
            onChange={(e) => set('target_audience', e.target.value as CampaignFormData['target_audience'])}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
          >
            <option value="all">All users</option>
            <option value="members">Members only</option>
            <option value="new_users">New users only</option>
            <option value="admins">Admins only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Starts at *</label>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Ends at</label>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => set('ends_at', e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
          />
          <p className="mt-0.5 text-[10px] text-muted-foreground">Leave empty for no end date</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Visibility</label>
          <select
            value={form.visibility_condition}
            onChange={(e) => set('visibility_condition', e.target.value as CampaignFormData['visibility_condition'])}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
          >
            <option value="always">Always visible</option>
            <option value="egg_hunt_revealed">Hidden until egg hunt reveal</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
          id="campaign-active"
          className="rounded border-border"
        />
        <label htmlFor="campaign-active" className="text-sm text-foreground">Active</label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onSubmit}
          disabled={saving || !form.title.trim() || !form.description.trim()}
          className="px-4 py-2 text-sm font-medium text-cta-fg bg-cta hover:bg-cta-hover rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function RateSlider({
  label,
  field,
  value,
  min,
  max,
  divisor,
  decimals,
  accent,
  onSave,
}: {
  label: string;
  field: string;
  value: number;
  min: number;
  max: number;
  divisor: number;
  decimals: number;
  accent: string;
  onSave: (field: string, value: number) => void;
}) {
  const [local, setLocal] = useState(Math.round(value * divisor));
  const [dragging, setDragging] = useState(false);

  // Sync with server value when not dragging
  useEffect(() => {
    if (!dragging) setLocal(Math.round(value * divisor));
  }, [value, divisor, dragging]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <input
        type="range"
        min={min}
        max={max}
        value={local}
        onChange={(e) => setLocal(parseInt(e.target.value))}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => {
          setDragging(false);
          onSave(field, local / divisor);
        }}
        onTouchEnd={() => {
          setDragging(false);
          onSave(field, local / divisor);
        }}
        className={`flex-1 h-1.5 ${accent}`}
      />
      <span className="text-xs font-mono text-muted-foreground w-10 text-right">
        {((local / divisor) * 100).toFixed(decimals)}%
      </span>
    </div>
  );
}

function EggHuntControls() {
  const { data: config, isLoading } = useEggHuntConfig();
  const { data: stats } = useEggHuntStats();
  const updateConfig = useUpdateEggHuntConfig();

  const toggle = async (field: keyof EggHuntConfig, value: boolean) => {
    try {
      await updateConfig.mutateAsync({ [field]: value });
      toast.success(`${String(field).replace(/_/g, ' ')} ${value ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update');
    }
  };

  const saveRate = async (field: string, value: number) => {
    try {
      await updateConfig.mutateAsync({ [field]: value });
      toast.success('Rate updated');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update');
    }
  };

  if (isLoading || !config) {
    return (
      <div className="animate-pulse rounded-xl border border-border p-5 space-y-3">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-organic-terracotta/30 bg-organic-terracotta-lightest0/5 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Egg className="h-5 w-5 text-organic-terracotta" />
        <h3 className="text-base font-semibold text-foreground">Easter Egg Hunt Controls</h3>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-organic-terracotta bg-organic-terracotta-lightest0/10 px-1.5 py-0.5 rounded">
          Stealth
        </span>
      </div>

      {/* Toggle grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shimmer */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-foreground">Shimmer</span>
            </div>
            <button
              onClick={() => toggle('shimmer_enabled', !config.shimmer_enabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                config.shimmer_enabled ? 'bg-organic-terracotta-lightest0' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                config.shimmer_enabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
          <RateSlider label="Rate" field="shimmer_rate" value={Number(config.shimmer_rate)} min={10} max={100} divisor={1000} decimals={1} accent="accent-organic-terracotta" onSave={saveRate} />
        </div>

        {/* Egg Hunt */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Egg className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">Egg Hunt</span>
            </div>
            <button
              onClick={() => toggle('hunt_enabled', !config.hunt_enabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                config.hunt_enabled ? 'bg-emerald-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                config.hunt_enabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
          <RateSlider label="Base rate" field="base_spawn_rate" value={Number(config.base_spawn_rate)} min={1} max={100} divisor={10000} decimals={2} accent="accent-emerald-500" onSave={saveRate} />
        </div>

        {/* Probability Override */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">Override Boost</span>
            </div>
            <button
              onClick={() => toggle('probability_override', !config.probability_override)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                config.probability_override ? 'bg-amber-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                config.probability_override ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
          <RateSlider label="Override rate" field="override_rate" value={Number(config.override_rate)} min={10} max={500} divisor={10000} decimals={2} accent="accent-amber-500" onSave={saveRate} />
        </div>

        {/* Campaign Reveal */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-foreground">Campaign Reveal</span>
            </div>
            <button
              onClick={() => toggle('campaign_revealed', !config.campaign_revealed)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                config.campaign_revealed ? 'bg-purple-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                config.campaign_revealed ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">Shows egg hunt carousel card, luck teaser, and profile collection.</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total_eggs_found}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Eggs Found</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.unique_hunters}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hunters</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{Object.keys(stats.eggs_by_element).length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Elements Found</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-sm font-medium text-foreground truncate">
              {stats.first_discovery ? stats.first_discovery.user_name : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">First Finder</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignsTab() {
  const { data: campaigns = [], isLoading } = useAdminCampaigns();
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const deleteMutation = useDeleteCampaign();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormData>(EMPTY_FORM);

  const handleCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setForm(campaignToForm(campaign));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    const payload = formToPayload(form);
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast.success('Campaign updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Campaign created');
      }
      handleCancel();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save campaign');
    }
  };

  const handleToggle = async (campaign: Campaign) => {
    try {
      await updateMutation.mutateAsync({ id: campaign.id, is_active: !campaign.is_active });
      toast.success(campaign.is_active ? 'Campaign deactivated' : 'Campaign activated');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to toggle campaign');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Campaign deleted');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete campaign');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
          <p className="text-sm text-muted-foreground">Manage dashboard carousel campaigns and announcements.</p>
        </div>
        {!showForm && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cta-fg bg-cta hover:bg-cta-hover rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        )}
      </div>

      {showForm && (
        <CampaignForm
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          saving={createMutation.isPending || updateMutation.isPending}
          isEdit={!!editingId}
        />
      )}

      {/* Easter Egg Hunt Controls */}
      <EggHuntControls />

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No campaigns yet. Create your first one!</p>
          </div>
        )}
        {campaigns.map((campaign: Campaign) => {
          const isExpired = campaign.ends_at && new Date(campaign.ends_at) < new Date();
          const isHidden = campaign.visibility_condition === 'egg_hunt_revealed';

          return (
            <div
              key={campaign.id}
              className={`rounded-xl border p-4 transition-colors ${
                campaign.is_active && !isExpired
                  ? 'border-border bg-card'
                  : 'border-border/50 bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {campaign.icon && <span className="text-lg">{campaign.icon}</span>}
                    <h3 className="font-medium text-foreground truncate">{campaign.title}</h3>
                    {!campaign.is_active && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                        Expired
                      </span>
                    )}
                    {isHidden && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{campaign.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Priority: {campaign.priority}</span>
                    <span>Audience: {campaign.target_audience}</span>
                    {campaign.cta_link && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {campaign.cta_link}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(campaign)}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    title={campaign.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {campaign.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-muted"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
