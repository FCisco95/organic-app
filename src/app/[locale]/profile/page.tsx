'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  AtSign,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Upload,
  MapPin,
  Globe,
  Loader2,
  Twitter,
  MessageCircle,
  Calendar,
  Info,
  Unlink2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import bs58 from 'bs58';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';
import { ReputationSummary } from '@/components/reputation/reputation-summary';
import { useUpdatePrivacy } from '@/features/members';

// Client-side balance cache TTL (15 seconds)
const BALANCE_CACHE_TTL_MS = 15 * 1000;

type LinkedTwitterAccount = {
  id: string;
  twitter_username: string;
  display_name: string | null;
  profile_image_url: string | null;
};

export default function ProfilePage() {
  const t = useTranslations('Profile');
  const tWallet = useTranslations('Wallet');
  const { user, profile, loading, refreshProfile } = useAuth();
  const { publicKey, signMessage, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const balanceCacheRef = useRef<Map<string, { balance: number; ts: number }>>(new Map());
  const balanceRequestRef = useRef<{ controller: AbortController | null; id: number }>({
    controller: null,
    id: 0,
  });

  const [linkingWallet, setLinkingWallet] = useState(false);
  const [gettingOrganicId, setGettingOrganicId] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [walletMismatch, setWalletMismatch] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    contributions: 0,
    pointsEarned: 0,
  });
  const [twitterAccount, setTwitterAccount] = useState<LinkedTwitterAccount | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [twitterLinking, setTwitterLinking] = useState(false);
  const [twitterUnlinking, setTwitterUnlinking] = useState(false);
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
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

  const loadTwitterAccount = useCallback(async () => {
    if (!user) {
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
  }, [user]);

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

  const fetchTokenBalance = useCallback(async (walletAddress: string, cacheKey: string) => {
    // Check client-side cache with TTL
    const cached = balanceCacheRef.current.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < BALANCE_CACHE_TTL_MS) {
      setTokenBalance(cached.balance);
      return;
    }

    balanceRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = balanceRequestRef.current.id + 1;
    balanceRequestRef.current = { controller, id: requestId };

    try {
      const response = await fetch('/api/organic-id/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (balanceRequestRef.current.id !== requestId) return;
      const balance = data.balance || 0;
      balanceCacheRef.current.set(cacheKey, { balance, ts: now });
      setTokenBalance(balance);
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error checking balance:', error);
      if (balanceRequestRef.current.id === requestId) {
        setTokenBalance(0);
      }
    }
  }, []);

  // Check token balance for linked wallet and detect mismatch
  useEffect(() => {
    balanceRequestRef.current.controller?.abort();
    if (!connected || !publicKey || !profile?.wallet_pubkey) {
      setWalletMismatch(false);
      return () => {
        balanceRequestRef.current.controller?.abort();
      };
    }

    const connectedAddress = publicKey.toBase58();
    const isMismatch = connectedAddress !== profile.wallet_pubkey;
    setWalletMismatch(isMismatch);
    if (isMismatch) {
      setTokenBalance(null);
      return;
    }

    const cacheKey = `${connectedAddress}|${
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'mainnet-beta'
    }`;
    fetchTokenBalance(profile.wallet_pubkey, cacheKey);

    return () => {
      balanceRequestRef.current.controller?.abort();
    };
  }, [connected, publicKey, profile?.wallet_pubkey, fetchTokenBalance]);

  const checkTokenBalance = async () => {
    if (!connected || !publicKey || !profile?.wallet_pubkey) return;
    const connectedAddress = publicKey.toBase58();
    if (connectedAddress !== profile.wallet_pubkey) return;
    const cacheKey = `${connectedAddress}|${
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'mainnet-beta'
    }`;
    await fetchTokenBalance(profile.wallet_pubkey, cacheKey);
  };

  const handleLinkWallet = async () => {
    if (!publicKey || !signMessage) {
      toast.error(t('toastConnectWallet'));
      return;
    }

    if (!user) {
      toast.error(t('toastSignInFirst'));
      return;
    }

    setLinkingWallet(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error(t('toastSessionExpired'));
        return;
      }

      const nonceResponse = await fetch('/api/auth/nonce');
      const { nonce } = await nonceResponse.json();

      const message = `Sign this message to link your wallet to Organic App.\n\nNonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const response = await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: bs58.encode(signature),
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('toastFailedLinkWallet'));
      }

      toast.success(t('toastWalletLinked'));
      await refreshProfile();
      await checkTokenBalance();
      router.refresh();

      setTimeout(async () => {
        await refreshProfile();
      }, 500);
    } catch (error: any) {
      console.error('Error linking wallet:', error);
      toast.error(error.message || t('toastFailedLinkWallet'));
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleGetOrganicId = async () => {
    if (!profile?.wallet_pubkey) {
      toast.error(t('toastLinkWalletFirst'));
      return;
    }

    if (!user) {
      toast.error(t('toastSignInFirst'));
      return;
    }

    setGettingOrganicId(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error(t('toastSessionExpired'));
        return;
      }

      const response = await fetch('/api/organic-id/assign', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign Organic ID');
      }

      toast.success(t('toastOrganicIdAssigned', { id: data.organicId }));
      await refreshProfile();
    } catch (error: any) {
      console.error('Error getting Organic ID:', error);
      toast.error(error.message || t('toastFailedOrganicId'));
    } finally {
      setGettingOrganicId(false);
    }
  };

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

  const handleStartTwitterLink = async () => {
    setTwitterLinking(true);
    try {
      const response = await fetch('/api/twitter/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <div className="w-12 h-12 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">{t('loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const formatStat = (value: number) => value.toLocaleString();
  const linkedTwitterHandle = twitterAccount ? `@${twitterAccount.twitter_username}` : profile.twitter;

  return (
    <PageContainer>
      <div data-testid="profile-page">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('pageSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/profile/progression?from=profile"
            data-testid="profile-progression-link"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t('viewProgression')}
          </Link>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t('editProfile')}
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Identity Section — avatar, name, bio, account details, social */}
      <div data-testid="profile-identity-section">
      {/* Profile Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-organic-orange to-yellow-400 flex items-center justify-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name || 'Profile'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-3xl font-bold text-white">
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
              className="absolute -bottom-1 -right-1 p-2 bg-organic-orange hover:bg-orange-600 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
              title={t('changeProfilePicture')}
              aria-label={t('changeProfilePicture')}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    {t('nameLabel')}
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder={t('namePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    {t('bioLabel')}
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder={t('bioPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.bio.length}/500 {t('characters')}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile.name || t('anonymousUser')}
                </h2>
                <p className="text-sm text-gray-600 mb-3">{profile.email}</p>
                {profile.bio && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                )}
                {!profile.bio && !isEditing && (
                  <p className="text-sm text-gray-400 italic">{t('noBioYet')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      </div>

      {/* Reputation Section */}
      <div data-testid="profile-reputation-section" className="mb-6">
        <ReputationSummary />
      </div>

      {/* Activity Section — submission and contribution stats */}
      <div data-testid="profile-activity-section" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('statsTitle')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              title={t('totalSubmissionsHelp')}
              aria-label={t('totalSubmissionsHelp')}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <p className="text-xs font-medium uppercase text-gray-500">
              {t('totalSubmissionsLabel')}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {statsLoading ? '—' : formatStat(stats.totalSubmissions)}
            </p>
          </div>
          <div className="relative rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              title={t('approvedSubmissionsHelp')}
              aria-label={t('approvedSubmissionsHelp')}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <p className="text-xs font-medium uppercase text-gray-500">
              {t('approvedSubmissionsLabel')}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {statsLoading ? '—' : formatStat(stats.approvedSubmissions)}
            </p>
          </div>
          <div className="relative rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              title={t('contributionsHelp')}
              aria-label={t('contributionsHelp')}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <p className="text-xs font-medium uppercase text-gray-500">{t('contributionsLabel')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {statsLoading ? '—' : formatStat(stats.contributions)}
            </p>
          </div>
          <div className="relative rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              title={t('pointsEarnedHelp')}
              aria-label={t('pointsEarnedHelp')}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <p className="text-xs font-medium uppercase text-gray-500">{t('pointsEarnedLabel')}</p>
            <p className="text-2xl font-semibold text-organic-orange">
              {statsLoading ? '—' : formatStat(stats.pointsEarned)}
            </p>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('accountDetails')}</h3>
          <div className="space-y-4">
            {/* Organic ID */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                {t('organicIdLabel')}
              </label>
              {profile.organic_id ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-organic-orange">
                    #{profile.organic_id}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {t('verified')}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">{t('notAssigned')}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                {t('roleLabel')}
              </label>
              <span
                className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                  profile.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : profile.role === 'council'
                      ? 'bg-blue-100 text-blue-700'
                      : profile.role === 'member'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {profile.role || t('guest')}
              </span>
            </div>

            {/* Member Since */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                {t('memberSince')}
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4" />
                <span>
                  {profile.created_at
                    ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
                    : t('unknown')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Social & Contact */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('socialContact')}</h3>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  {t('locationLabel')}
                </label>
                <div className="relative">
                  <MapPin aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder={t('locationPlaceholder')}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                    maxLength={100}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  {t('websiteLabel')}
                </label>
                <div className="relative">
                  <Globe aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder={t('websitePlaceholder')}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                    maxLength={200}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  {t('discordLabel')}
                </label>
                <div className="relative">
                  <MessageCircle aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={editForm.discord}
                    onChange={(e) => setEditForm({ ...editForm, discord: e.target.value })}
                    placeholder={t('discordPlaceholder')}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                    maxLength={50}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  {t('twitterLabel')}
                </label>
                {linkedTwitterHandle ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                      <Twitter className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{linkedTwitterHandle}</span>
                    </div>
                    {profile.twitter_verified && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        {t('verified')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">{t('twitterAccountNotLinked')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.location && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-organic-orange hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {linkedTwitterHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Twitter className="w-4 h-4 text-gray-400" />
                  <a
                    href={`https://x.com/${linkedTwitterHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-organic-orange hover:underline"
                  >
                    {linkedTwitterHandle}
                  </a>
                </div>
              )}
              {profile.discord && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span>{profile.discord}</span>
                </div>
              )}
              {!profile.location &&
                !profile.website &&
                !linkedTwitterHandle &&
                !profile.discord &&
                !isEditing && (
                  <p className="text-sm text-gray-400 italic">{t('noSocialLinksYet')}</p>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Twitter/X Account Linking */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('twitterAccountTitle')}</h3>
            <p className="text-sm text-gray-600">{t('twitterAccountDescription')}</p>
          </div>
          {twitterLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {twitterAccount ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-emerald-200 flex-shrink-0">
                  {twitterAccount.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={twitterAccount.profile_image_url}
                      alt={twitterAccount.twitter_username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-700">
                      <AtSign className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('twitterAccountConnected')}
                  </p>
                  <p className="text-sm text-emerald-800 truncate">
                    {t('twitterLinkedAs', {
                      username: `@${twitterAccount.twitter_username}`,
                      name: twitterAccount.display_name || `@${twitterAccount.twitter_username}`,
                    })}
                  </p>
                  {profile.twitter_verified && (
                    <p className="text-xs text-emerald-700">{t('twitterAccountVerified')}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleUnlinkTwitter}
                disabled={twitterUnlinking || twitterLinking}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-3 py-2 sm:py-1.5 text-sm text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {twitterUnlinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink2 className="w-4 h-4" />
                )}
                {twitterUnlinking ? t('unlinkingTwitter') : t('unlinkTwitter')}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900 mb-3">{t('twitterAccountNotLinked')}</p>
            <button
              type="button"
              onClick={handleStartTwitterLink}
              disabled={twitterLinking || twitterUnlinking}
              className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {twitterLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <AtSign className="w-4 h-4" />}
              {twitterLinking ? t('connectingTwitter') : t('connectTwitter')}
            </button>
          </div>
        )}
      </div>

      {/* Profile Privacy */}
      <div data-testid="profile-privacy-section" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('privacyTitle')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('privacyDescription')}</p>

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {profile.profile_visible ? t('privacyPublicStatus') : t('privacyPrivateStatus')}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {profile.profile_visible ? t('privacyPublicHint') : t('privacyPrivateHint')}
            </p>
          </div>

          <button
            type="button"
            data-testid="profile-privacy-toggle"
            onClick={handleToggleProfileVisibility}
            disabled={updatePrivacyMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {updatePrivacyMutation.isPending
              ? t('updatingPrivacy')
              : profile.profile_visible
                ? t('setPrivate')
                : t('setPublic')}
          </button>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('solanaWallet')}</h2>

        <div className="mb-4 text-sm text-gray-600">
          {connected && publicKey ? (
            <span>
              {tWallet('connectedWalletLabel')}{' '}
              <span className="font-mono text-gray-800">
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </span>
            </span>
          ) : (
            <span>{tWallet('connectWalletFromNav')}</span>
          )}
        </div>

        {/* Wallet Mismatch Warning */}
        {walletMismatch && publicKey && profile.wallet_pubkey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-amber-800 mb-1">{t('walletMismatchWarning')}</p>
            <p className="text-xs text-amber-700">
              {t('walletMismatchDescription', {
                connected: `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`,
                linked: `${profile.wallet_pubkey.slice(0, 4)}...${profile.wallet_pubkey.slice(-4)}`,
              })}
            </p>
          </div>
        )}

        {profile.wallet_pubkey && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              {t('linkedWallet')}
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-mono text-gray-700 break-all mb-3">
                {profile.wallet_pubkey}
              </p>
              {tokenBalance !== null && connected && publicKey && !walletMismatch && (
                <div className="flex items-center">
                  <span className="text-xs font-medium text-gray-500 mr-2">{t('orgBalance')}</span>
                  <span className="text-sm font-semibold text-organic-orange">
                    {tokenBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {connected && publicKey && !profile.wallet_pubkey && (
          <button
            onClick={handleLinkWallet}
            disabled={linkingWallet}
            className="w-full bg-organic-orange hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {linkingWallet ? t('linkingWallet') : t('linkWalletToProfile')}
          </button>
        )}
      </div>

      {/* Notification Preferences */}
      <div data-testid="profile-preferences-section" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t('notificationPreferencesTitle')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">{t('notificationPreferencesDescription')}</p>
        <NotificationPreferences />
      </div>

      {/* Get Organic ID Section */}
      {profile.wallet_pubkey && !profile.organic_id && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('getYourOrganicId')}</h2>
          <p className="text-sm text-gray-600 mb-4">{t('holdTokensDescription')}</p>

          {tokenBalance !== null &&
            tokenBalance > 0 &&
            connected &&
            publicKey &&
            !walletMismatch && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 font-medium">
                  ✓ {t('linkedWalletHoldsTokens', { balance: tokenBalance.toFixed(2) })}
                </p>
              </div>
            )}

          <button
            onClick={handleGetOrganicId}
            disabled={gettingOrganicId}
            className="bg-organic-orange hover:bg-orange-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {gettingOrganicId ? t('verifying') : t('getOrganicId')}
          </button>
        </div>
      )}

      {/* Success Message */}
      {profile.organic_id && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🎉 {t('verifiedMemberTitle')}
          </h3>
          <p className="text-sm text-gray-600">{t('verifiedMemberDescription')}</p>
        </div>
      )}
      </div>
    </PageContainer>
  );
}
