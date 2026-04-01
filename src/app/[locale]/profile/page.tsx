'use client';

import { useEffect, useState, useRef } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';

import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  Edit2,
  Save,
  X,
  Upload,
  Info,
  Hash,
  Award,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { TwoColumnLayout } from '@/components/layout/two-column-layout';
import { ReputationSummary } from '@/components/reputation/reputation-summary';
import { TrophyShowcase } from '@/components/reputation/trophy-showcase';
import { useUpdatePrivacy } from '@/features/members';
import { cn } from '@/lib/utils';
import {
  ProfileTabs,
  ProfileAccountTab,
  ProfileSocialTab,
  ProfileWalletTab,
  ProfileNotificationsTab,
} from '@/components/profile';
import type { ProfileTabId } from '@/components/profile';

export default function ProfilePage() {
  const t = useTranslations('Profile');
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ProfileTabId>('account');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    contributions: 0,
    pointsEarned: 0,
  });
  const updatePrivacyMutation = useUpdatePrivacy();

  // Edit form states
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    discord: '',
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        discord: profile.discord || '',
      });
    }
  }, [profile]);

  // Redirect if not authenticated (fallback — middleware handles this server-side)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?returnTo=/profile');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const supabase = createClient();
        const [totalSubmissionsResponse, approvedSubmissionsResponse, votesResponse] =
          await Promise.all([
            supabase
              .from('task_submissions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('task_submissions')
              .select('earned_points', { count: 'exact' })
              .eq('user_id', user.id)
              .eq('review_status', 'approved'),
            supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('voter_id', user.id),
          ]);

        if (totalSubmissionsResponse.error) {
          console.error('Error loading total submission count:', totalSubmissionsResponse.error);
        }

        if (approvedSubmissionsResponse.error) {
          console.error(
            'Error loading approved submission count:',
            approvedSubmissionsResponse.error
          );
        }

        if (votesResponse.error) {
          console.error('Error loading vote count:', votesResponse.error);
        }

        if (!isActive) return;
        const totalSubmissions = totalSubmissionsResponse.count || 0;
        const approvedSubmissions = approvedSubmissionsResponse.count || 0;
        const votes = votesResponse.count || 0;
        const pointsEarned =
          (approvedSubmissionsResponse.data as { earned_points: number | null }[] | null)?.reduce(
            (total, submission) => total + (submission.earned_points || 0),
            0
          ) || 0;

        setStats({
          totalSubmissions,
          approvedSubmissions,
          contributions: totalSubmissions + votes,
          pointsEarned,
        });
      } catch (error) {
        console.error('Error loading profile stats:', error);
      } finally {
        if (isActive) setStatsLoading(false);
      }
    };

    loadStats();

    return () => {
      isActive = false;
    };
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('toastSelectImage'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toastImageTooLarge'));
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      toast.success(t('toastProfilePictureUpdated'));
      await refreshProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || t('toastFailedUploadImage'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: editForm.name.trim() || null,
          bio: editForm.bio.trim() || null,
          location: editForm.location.trim() || null,
          website: editForm.website.trim() || null,
          discord: editForm.discord.trim() || null,
        } as any)
        .eq('id', user!.id as any);

      if (error) throw error;

      toast.success(t('toastProfileUpdated'));
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(t('toastFailedUpdateProfile'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      setEditForm({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        discord: profile.discord || '',
      });
    }
  };

  const handleToggleProfileVisibility = async () => {
    if (!profile) return;

    const nextVisibility = !profile.profile_visible;

    try {
      await updatePrivacyMutation.mutateAsync(nextVisibility);
      await refreshProfile();
      toast.success(nextVisibility ? t('toastProfileVisible') : t('toastProfileHidden'));
    } catch {
      toast.error(t('toastFailedUpdatePrivacy'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-organic-terracotta border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">{t('loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-organic-terracotta border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('redirecting')}</p>
        </div>
      </div>
    );
  }

  const formatStat = (value: number) => value.toLocaleString();

  return (
    <PageContainer>
      <div data-testid="profile-page">
        {/* ===== HERO STRIP ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6 mb-4 text-white opacity-0 animate-fade-up stagger-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Avatar + Identity */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-organic-terracotta to-yellow-400 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.name || 'Profile'}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {(profile.name || profile.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-0.5 -right-0.5 p-1.5 bg-cta hover:bg-cta-hover text-cta-fg rounded-full shadow-lg transition-colors disabled:opacity-50"
                  title={t('changeProfilePicture')}
                  aria-label={t('changeProfilePicture')}
                >
                  {uploading ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
                    {profile.name || t('anonymousUser')}
                  </h1>
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium capitalize',
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
                  {profile.organic_id && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-organic-terracotta">
                      <Hash className="w-3 h-3" />
                      {profile.organic_id}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300 truncate">{profile.email}</p>
              </div>
            </div>

            {/* Stat counters — dense horizontal strip */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {[
                { label: t('totalSubmissionsLabel'), value: stats.totalSubmissions },
                { label: t('approvedSubmissionsLabel'), value: stats.approvedSubmissions },
                { label: t('contributionsLabel'), value: stats.contributions },
                { label: t('pointsEarnedLabel'), value: stats.pointsEarned },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={cn(
                    'text-center px-3 py-2',
                    i < 3 && 'border-r border-white/20'
                  )}
                >
                  <p className="text-lg font-bold font-mono tabular-nums text-white leading-none">
                    {statsLoading ? '\u2014' : formatStat(stat.value)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 whitespace-nowrap">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/profile/progression?from=profile"
                data-testid="profile-progression-link"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                <Award className="w-3.5 h-3.5" />
                {t('viewProgression')}
              </Link>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-cta-fg transition-colors hover:bg-cta-hover"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {t('editProfile')}
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-cta-fg hover:bg-cta-hover disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? t('saving') : t('saveChanges')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== MAIN LAYOUT: Tabs + Sidebar ===== */}
        <TwoColumnLayout
          stickyTop="top-20"
          sidebar={
            <>
              <div data-testid="profile-reputation-section">
                <ReputationSummary />
              </div>

              {/* Trophy showcase */}
              <div className="mt-4">
                <TrophyShowcase />
              </div>

              {/* Activity stats card */}
              <div data-testid="profile-activity-section" className="rounded-xl border border-border bg-card p-4 mt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('statsTitle')}</h2>
                <div className="space-y-2">
                  {[
                    { label: t('totalSubmissionsLabel'), value: stats.totalSubmissions, help: t('totalSubmissionsHelp') },
                    { label: t('approvedSubmissionsLabel'), value: stats.approvedSubmissions, help: t('approvedSubmissionsHelp') },
                    { label: t('contributionsLabel'), value: stats.contributions, help: t('contributionsHelp') },
                    { label: t('pointsEarnedLabel'), value: stats.pointsEarned, help: t('pointsEarnedHelp'), highlight: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {item.label}
                        <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground" title={item.help} aria-label={item.help}>
                          <Info className="h-3 w-3" />
                        </button>
                      </span>
                      <span className={cn(
                        'text-sm font-bold font-mono tabular-nums',
                        item.highlight ? 'text-organic-terracotta' : 'text-foreground'
                      )}>
                        {statsLoading ? '\u2014' : formatStat(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        >
          <div className="min-w-0">
            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'account' && (
              <ProfileAccountTab
                profile={profile}
                isEditing={isEditing}
                editForm={editForm}
                setEditForm={setEditForm}
                updatePrivacyMutation={updatePrivacyMutation}
                handleToggleProfileVisibility={handleToggleProfileVisibility}
              />
            )}

            {activeTab === 'social' && (
              <ProfileSocialTab
                profile={profile}
                isEditing={isEditing}
                editForm={editForm}
                setEditForm={setEditForm}
                refreshProfile={refreshProfile}
                userId={user.id}
              />
            )}

            {activeTab === 'wallet' && (
              <ProfileWalletTab
                profile={profile}
                userId={user.id}
                refreshProfile={refreshProfile}
              />
            )}

            {activeTab === 'notifications' && (
              <ProfileNotificationsTab />
            )}
          </div>
        </TwoColumnLayout>
      </div>
    </PageContainer>
  );
}
