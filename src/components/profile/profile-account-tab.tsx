'use client';

import { useTranslations } from 'next-intl';
import { Calendar, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EditForm {
  name: string;
  bio: string;
  location: string;
  website: string;
  discord: string;
}

interface ProfileAccountTabProps {
  profile: {
    organic_id: number | null;
    role: string | null;
    created_at: string | null;
    bio: string | null;
    profile_visible: boolean;
  };
  isEditing: boolean;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  updatePrivacyMutation: { isPending: boolean };
  handleToggleProfileVisibility: () => void;
}

export function ProfileAccountTab({
  profile,
  isEditing,
  editForm,
  setEditForm,
  updatePrivacyMutation,
  handleToggleProfileVisibility,
}: ProfileAccountTabProps) {
  const t = useTranslations('Profile');

  return (
    <div data-testid="profile-identity-section" className="space-y-4">
      {/* Profile info card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('accountDetails')}</h2>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                {t('nameLabel')}
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('namePlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent bg-background text-foreground"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                {t('bioLabel')}
              </label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder={t('bioPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none bg-background text-foreground"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editForm.bio.length}/500 {t('characters')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('organicIdLabel')}</p>
                {profile.organic_id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold font-mono text-organic-terracotta">
                      #{profile.organic_id}
                    </span>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                      {t('verified')}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t('notAssigned')}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('roleLabel')}</p>
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize',
                    profile.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : profile.role === 'council'
                        ? 'bg-blue-100 text-blue-700'
                        : profile.role === 'member'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {profile.role || t('guest')}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('memberSince')}</p>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {profile.created_at
                      ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
                      : t('unknown')}
                  </span>
                </div>
              </div>
            </div>
            {profile.bio ? (
              <div className="pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('bioLabel')}</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pt-3 border-t border-border">
                {t('noBioYet')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Privacy */}
      <div data-testid="profile-privacy-section" className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{t('privacyTitle')}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t('privacyDescription')}</p>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {profile.profile_visible ? t('privacyPublicStatus') : t('privacyPrivateStatus')}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profile.profile_visible ? t('privacyPublicHint') : t('privacyPrivateHint')}
            </p>
          </div>
          <button
            type="button"
            data-testid="profile-privacy-toggle"
            onClick={handleToggleProfileVisibility}
            disabled={updatePrivacyMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {updatePrivacyMutation.isPending
              ? t('updatingPrivacy')
              : profile.profile_visible
                ? t('setPrivate')
                : t('setPublic')}
          </button>
        </div>
      </div>
    </div>
  );
}
