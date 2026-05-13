'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, Leaf, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useCreatePost, useUserPoints } from '@/features/posts/hooks';
import type { PostType } from '@/features/posts/types';
import { cn } from '@/lib/utils';

interface PostComposerDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: PostType; labelKey: string; descriptionKey: string }[] = [
  { value: 'text', labelKey: 'composerTypePost', descriptionKey: 'composerTypePostDesc' },
  { value: 'thread', labelKey: 'composerTypeThread', descriptionKey: 'composerTypeThreadDesc' },
  { value: 'link_share', labelKey: 'composerTypeLink', descriptionKey: 'composerTypeLinkDesc' },
  { value: 'announcement', labelKey: 'composerTypeAnnouncement', descriptionKey: 'composerTypeAnnouncementDesc' },
];

/* ─── Inline Compose Bar ───────────────────────────────────────────────── */

export function InlineComposeBar({ onExpand }: { onExpand: () => void }) {
  const t = useTranslations('Posts');
  const { profile } = useAuth();

  if (!profile?.organic_id) return null;

  return (
    <div
      className="rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer opacity-0 animate-fade-up stagger-2"
      onClick={onExpand}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-organic-terracotta to-yellow-300 flex items-center justify-center overflow-hidden shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">
              {(profile.name || profile.email || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Prompt */}
        <span className="text-sm text-muted-foreground flex-1">{t('composerPrompt')}</span>

        {/* Type pills (decorative) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {t('composerTypePost')}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {t('composerTypeThread')}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {t('composerTypeLink')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Full Composer Dialog ─────────────────────────────────────────────── */

export function PostComposerDialog({ open, onClose }: PostComposerDialogProps) {
  const t = useTranslations('Posts');
  const { profile } = useAuth();
  const createPost = useCreatePost();
  const { data: pointsData } = useUserPoints({ enabled: open });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [linkUrl, setLinkUrl] = useState('');
  const [isOrganic, setIsOrganic] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === 'admin';
  const availableTypes = isAdmin ? TYPE_OPTIONS : TYPE_OPTIONS.filter((t) => t.value !== 'announcement');

  // Calculate cost dynamically
  const postCost = useMemo(() => {
    if (postType === 'announcement') return 0;
    if (!pointsData) return 0;

    if (isOrganic) {
      if (pointsData.free_organic_remaining > 0) return 0;
      return pointsData.costs.organic_paid[postType] ?? 0;
    }

    return pointsData.costs.non_organic[postType] ?? 0;
  }, [postType, isOrganic, pointsData]);

  const balance = pointsData?.claimable_points ?? 0;
  const canAfford = balance >= postCost;
  const freeOrganicRemaining = pointsData?.free_organic_remaining ?? 0;

  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset organic when switching to announcement
  useEffect(() => {
    if (postType === 'announcement') setIsOrganic(false);
  }, [postType]);

  function handleAddTag() {
    const tag = tagInput.trim();
    if (tag && tags.length < 5 && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast.error(t('composerRequired'));
      return;
    }

    if (postType !== 'announcement' && !linkUrl.trim()) {
      toast.error(t('composerLinkRequired'));
      return;
    }

    if (!canAfford) {
      toast.error(t('composerInsufficientPoints'));
      return;
    }

    try {
      await createPost.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        post_type: postType,
        tags: tags.length > 0 ? tags : undefined,
        twitter_url: postType !== 'announcement' ? linkUrl.trim() : undefined,
        is_organic: isOrganic,
      });
      toast.success(t('composerSuccess'));
      setTitle('');
      setBody('');
      setLinkUrl('');
      setPostType('text');
      setIsOrganic(false);
      setTags([]);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('composerError');
      toast.error(message);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t('composerTitle')}</h2>
          <div className="flex items-center gap-3">
            {/* Points balance */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="w-3.5 h-3.5" />
              <span className="tabular-nums font-medium">{balance}</span>
              <span>{t('composerPointsLabel')}</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Post type selector */}
          <div className="flex gap-1.5 overflow-x-auto">
            {availableTypes.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPostType(opt.value)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
                  postType === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* Organic toggle */}
          {postType !== 'announcement' && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Leaf className={cn('w-4 h-4', isOrganic ? 'text-green-500' : 'text-muted-foreground')} />
                <div>
                  <p className="text-xs font-medium text-foreground">{t('composerOrganicLabel')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('composerOrganicHint')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOrganic && (
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                    {freeOrganicRemaining > 0
                      ? t('composerFreeRemaining', { count: freeOrganicRemaining })
                      : t('composerNoFreeRemaining')}
                  </span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOrganic}
                  onClick={() => setIsOrganic(!isOrganic)}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    isOrganic ? 'bg-green-500' : 'bg-muted-foreground/30',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                      isOrganic ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Link URL — required for non-announcements */}
          {postType !== 'announcement' && (
            <div>
              <input
                type="url"
                placeholder={t('composerLinkPlaceholder')}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{t('composerLinkHint')}</p>
            </div>
          )}

          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            placeholder={t('composerTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {/* Body */}
          <textarea
            placeholder={postType === 'thread' ? t('composerBodyThread') : t('composerBodyDefault')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={10000}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('composerTagPlaceholder')}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                maxLength={24}
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                {t('composerTagAdd')}
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-muted-foreground">
              {body.length}/10000
            </p>
            {/* Cost display */}
            {postType !== 'announcement' && (
              <div className={cn(
                'flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5',
                postCost === 0
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : canAfford
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400',
              )}>
                <Coins className="w-3 h-3" />
                {postCost === 0 ? t('composerFreePost') : t('composerCost', { cost: postCost })}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              {t('composerCancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                createPost.isPending ||
                !title.trim() ||
                !body.trim() ||
                (postType !== 'announcement' && !linkUrl.trim()) ||
                !canAfford
              }
              className="text-xs font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createPost.isPending ? t('composerPosting') : t('composerSubmit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostComposerFab({ onClick }: { onClick: () => void }) {
  const t = useTranslations('Posts');
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
    >
      <Plus className="w-4 h-4" />
      {t('composerSubmit')}
    </button>
  );
}
