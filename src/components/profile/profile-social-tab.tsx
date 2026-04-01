'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Twitter,
  Unlink2,
} from 'lucide-react';
import { XBrandIcon } from '@/components/ui/x-brand-icon';
import toast from 'react-hot-toast';

type LinkedTwitterAccount = {
  id: string;
  twitter_username: string;
  display_name: string | null;
  profile_image_url: string | null;
};

interface EditForm {
  name: string;
  bio: string;
  location: string;
  website: string;
  discord: string;
}

interface ProfileSocialTabProps {
  profile: {
    location: string | null;
    website: string | null;
    twitter: string | null;
    twitter_verified: boolean;
    discord: string | null;
  };
  isEditing: boolean;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  refreshProfile: () => Promise<void>;
  userId: string | undefined;
}

export function ProfileSocialTab({
  profile,
  isEditing,
  editForm,
  setEditForm,
  refreshProfile,
  userId,
}: ProfileSocialTabProps) {
  const t = useTranslations('Profile');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [twitterAccount, setTwitterAccount] = useState<LinkedTwitterAccount | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [twitterLinking, setTwitterLinking] = useState(false);
  const [twitterUnlinking, setTwitterUnlinking] = useState(false);
  const [twitterHandleInput, setTwitterHandleInput] = useState('');
  const [twitterHandleSaving, setTwitterHandleSaving] = useState(false);

  const loadTwitterAccount = useCallback(async () => {
    if (!userId) {
      setTwitterAccount(null);
      return;
    }

    setTwitterLoading(true);
    try {
      const response = await fetch('/api/twitter/account');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch Twitter account');
      }

      setTwitterAccount((payload.account as LinkedTwitterAccount | null) ?? null);
    } catch {
      setTwitterAccount(null);
    } finally {
      setTwitterLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadTwitterAccount();
  }, [loadTwitterAccount]);

  useEffect(() => {
    const linked = searchParams.get('twitter_linked');
    const reason = searchParams.get('reason');
    if (!linked) return;

    if (linked === '1') {
      toast.success(t('toastTwitterLinked'));
    } else {
      toast.error(
        reason ? `${t('toastFailedLinkTwitter')} (${reason})` : t('toastFailedLinkTwitter')
      );
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('twitter_linked');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.toString());

    void refreshProfile();
    void loadTwitterAccount();
  }, [loadTwitterAccount, refreshProfile, searchParams, t]);

  const handleStartTwitterLink = async () => {
    setTwitterLinking(true);
    try {
      const response = await fetch('/api/twitter/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json();

      if (!response.ok || !payload.auth_url) {
        throw new Error(payload.error || t('toastFailedLinkTwitter'));
      }

      window.location.assign(payload.auth_url as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toastFailedLinkTwitter'));
    } finally {
      setTwitterLinking(false);
    }
  };

  const handleUnlinkTwitter = async () => {
    setTwitterUnlinking(true);
    try {
      const response = await fetch('/api/twitter/account', {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t('toastFailedUnlinkTwitter'));
      }

      toast.success(t('toastTwitterUnlinked'));
      await refreshProfile();
      await loadTwitterAccount();
    } catch {
      toast.error(t('toastFailedUnlinkTwitter'));
    } finally {
      setTwitterUnlinking(false);
    }
  };

  const handleSaveTwitterHandle = async () => {
    const handle = twitterHandleInput.replace(/^@/, '').trim();
    if (!handle) return;

    setTwitterHandleSaving(true);
    try {
      const response = await fetch('/api/twitter/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: handle }),
      });

      if (!response.ok) {
        throw new Error('Failed to save handle');
      }

      toast.success(t('toastTwitterLinked'));
      await refreshProfile();
      await loadTwitterAccount();
    } catch {
      toast.error(t('toastFailedLinkTwitter'));
    } finally {
      setTwitterHandleSaving(false);
    }
  };

  const needsHandle = twitterAccount && (!twitterAccount.twitter_username || twitterAccount.twitter_username === 'pending');
  const linkedTwitterHandle = twitterAccount && twitterAccount.twitter_username && twitterAccount.twitter_username !== 'pending'
    ? `@${twitterAccount.twitter_username}`
    : profile.twitter;

  return (
    <div className="space-y-4">
      {/* Social links */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('socialContact')}</h2>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                {t('locationLabel')}
              </label>
              <div className="relative">
                <MapPin aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder={t('locationPlaceholder')}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent bg-background text-foreground"
                  maxLength={100}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                {t('websiteLabel')}
              </label>
              <div className="relative">
                <Globe aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder={t('websitePlaceholder')}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent bg-background text-foreground"
                  maxLength={200}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                {t('discordLabel')}
              </label>
              <div className="relative">
                <MessageCircle aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={editForm.discord}
                  onChange={(e) => setEditForm({ ...editForm, discord: e.target.value })}
                  placeholder={t('discordPlaceholder')}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent bg-background text-foreground"
                  maxLength={50}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                {t('twitterLabel')}
              </label>
              {linkedTwitterHandle ? (
                <div className="flex flex-col items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 text-sm text-foreground min-w-0">
                    <Twitter className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{linkedTwitterHandle}</span>
                  </div>
                  {profile.twitter_verified && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {t('verified')}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('twitterAccountNotLinked')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {profile.location && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-organic-terracotta hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {linkedTwitterHandle && (
              <div className="flex items-center gap-2 text-sm">
                <Twitter className="w-4 h-4 text-muted-foreground" />
                <a
                  href={`https://x.com/${linkedTwitterHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-organic-terracotta hover:underline"
                >
                  {linkedTwitterHandle}
                </a>
              </div>
            )}
            {profile.discord && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span>{profile.discord}</span>
              </div>
            )}
            {!profile.location &&
              !profile.website &&
              !linkedTwitterHandle &&
              !profile.discord &&
              !isEditing && (
                <p className="text-sm text-muted-foreground italic">{t('noSocialLinksYet')}</p>
              )}
          </div>
        )}
      </div>

      {/* Twitter/X account linking */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-muted-foreground">
            <XBrandIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{t('twitterAccountTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('twitterAccountDescription')}</p>
          </div>
          {twitterLoading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
        </div>

        {twitterAccount ? (
          needsHandle ? (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-medium text-foreground">{t('twitterConnectedEnterHandle')}</p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    type="text"
                    value={twitterHandleInput}
                    onChange={(e) => setTwitterHandleInput(e.target.value)}
                    placeholder={t('twitterHandlePlaceholder')}
                    className="w-full pl-8 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent bg-background text-foreground text-sm"
                    maxLength={50}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveTwitterHandle}
                  disabled={twitterHandleSaving || !twitterHandleInput.replace(/^@/, '').trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-50"
                >
                  {twitterHandleSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : t('save')}
                </button>
              </div>
              <button
                type="button"
                onClick={handleUnlinkTwitter}
                disabled={twitterUnlinking}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {twitterUnlinking ? t('unlinkingTwitter') : t('unlinkTwitter')}
              </button>
            </div>
          ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-emerald-200">
                  {twitterAccount.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={twitterAccount.profile_image_url}
                      alt={twitterAccount.twitter_username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <XBrandIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center border-2 border-card">
                  <XBrandIcon className="w-2.5 h-2.5" />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {twitterAccount.display_name || twitterAccount.twitter_username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{twitterAccount.twitter_username}
                </p>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                {t('twitterAccountVerified')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleUnlinkTwitter}
              disabled={twitterUnlinking || twitterLinking}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-organic-terracotta"
            >
              {twitterUnlinking ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Unlink2 className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{twitterUnlinking ? t('unlinkingTwitter') : t('unlinkTwitter')}</span>
            </button>
          </div>
          )
        ) : (
          <div className="flex flex-col items-center text-center py-6 rounded-lg border border-dashed border-border bg-muted/30">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <XBrandIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t('twitterConnectHeading')}</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">{t('twitterConnectValueProp')}</p>
            <button
              type="button"
              onClick={handleStartTwitterLink}
              disabled={twitterLinking || twitterUnlinking}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:ring-offset-2"
            >
              {twitterLinking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XBrandIcon className="w-4 h-4" />
              )}
              {twitterLinking ? t('connectingTwitter') : t('connectTwitter')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
