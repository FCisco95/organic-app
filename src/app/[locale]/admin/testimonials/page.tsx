'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import toast from 'react-hot-toast';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { PageHero } from '@/components/ui/page-hero';
import { useAuth } from '@/features/auth/context';
import {
  usePendingTestimonials,
  useReviewTestimonial,
} from '@/features/testimonials/hooks';
import type { PendingTestimonial } from '@/features/testimonials/types';

const ADMIN_ROLES = new Set(['admin', 'council']);

function formatRelative(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ageMs / (60 * 1000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminTestimonialsPage() {
  const t = useTranslations('Dashboard.testimonials.admin');
  const { profile, loading } = useAuth();
  const router = useRouter();
  const { data: pending = [], isLoading } = usePendingTestimonials();
  const review = useReviewTestimonial();

  useEffect(() => {
    if (loading) return;
    if (!profile?.role || !ADMIN_ROLES.has(profile.role)) {
      router.replace('/');
    }
  }, [loading, profile?.role, router]);

  const handleAction = async (
    testimonial: PendingTestimonial,
    action: 'approve' | 'reject'
  ) => {
    try {
      const result = await review.mutateAsync({
        testimonialId: testimonial.id,
        action,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
    } catch {
      toast.error('Something went wrong');
    }
  };

  if (loading || !profile?.role || !ADMIN_ROLES.has(profile.role)) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHero
          icon={MessageSquare}
          title={t('queueTitle')}
          description={t('noneDescription')}
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-border bg-card px-4 py-16 text-center">
            <div className="mb-4 rounded-xl bg-muted p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-foreground">{t('noneTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('noneDescription')}
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {pending.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <header className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-organic-terracotta/15 text-sm font-semibold text-organic-terracotta">
                      {(item.member.name?.trim()?.[0] ?? `${item.member.organicId ?? '?'}`)
                        .toString()
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.member.name ?? `Member #${item.member.organicId ?? '—'}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('submittedAt', { when: formatRelative(item.createdAt) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5" aria-label={`${item.rating} of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < item.rating
                            ? 'fill-organic-terracotta text-organic-terracotta'
                            : 'text-muted-foreground/30'
                        }`}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                </header>

                <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{item.quote}&rdquo;
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(item, 'reject')}
                    disabled={review.isPending}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {t('reject')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(item, 'approve')}
                    disabled={review.isPending}
                    className="rounded-lg bg-organic-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-organic-terracotta-hover disabled:opacity-50"
                  >
                    {t('approve')}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PageContainer>
  );
}
