'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useApprovedTestimonials } from '@/features/testimonials/hooks';
import type { ApprovedTestimonial } from '@/features/testimonials/types';
import { GiveFeedbackModal } from './give-feedback-modal';
import type { TenantBranding } from '@/lib/tenant/types';

interface TestimonialsRailProps {
  branding: TenantBranding;
  isAuthenticated: boolean;
}

const PAGE_SIZE_DESKTOP = 3;
const PAGE_SIZE_MOBILE = 1;

export function TestimonialsRail({ branding, isAuthenticated }: TestimonialsRailProps) {
  const t = useTranslations('Dashboard.testimonials');
  const { data: testimonials = [], isLoading } = useApprovedTestimonials();
  const [pageIndex, setPageIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Pagination is rendered as named-dot pagination: each "page" shows
  // PAGE_SIZE_DESKTOP cards on desktop, PAGE_SIZE_MOBILE on mobile.
  // The dot count uses the desktop value as the canonical source so the
  // pagination doesn't reshuffle on resize.
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(testimonials.length / PAGE_SIZE_DESKTOP)),
    [testimonials.length]
  );

  const visibleSlice = useMemo(() => {
    const startDesktop = pageIndex * PAGE_SIZE_DESKTOP;
    return testimonials.slice(startDesktop, startDesktop + PAGE_SIZE_DESKTOP);
  }, [testimonials, pageIndex]);

  const visibleMobile = useMemo(() => {
    // Mobile shows 1 card at a time; navigation moves through individual cards
    return testimonials.slice(pageIndex, pageIndex + PAGE_SIZE_MOBILE);
  }, [testimonials, pageIndex]);

  const handlePrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const handleNext = () =>
    setPageIndex((i) =>
      Math.min(testimonials.length - 1, i + 1)
    );

  return (
    <section
      data-testid="dashboard-testimonials"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl text-foreground">{t('title')}</h2>
        <button
          type="button"
          onClick={() => isAuthenticated && setModalOpen(true)}
          disabled={!isAuthenticated}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-organic-terracotta/30 bg-organic-terracotta/10 px-4 py-1.5 text-sm font-medium text-organic-terracotta transition-colors hover:bg-organic-terracotta/15 disabled:cursor-not-allowed disabled:opacity-60"
          aria-disabled={!isAuthenticated}
        >
          {isAuthenticated ? t('shareCta') : t('shareCtaAnonymous')}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:hidden">
            {visibleMobile.map((item) => (
              <TestimonialCard
                key={item.id}
                testimonial={item}
                communityName={branding.communityName}
              />
            ))}
          </div>
          <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-3">
            {visibleSlice.map((item) => (
              <TestimonialCard
                key={item.id}
                testimonial={item}
                communityName={branding.communityName}
              />
            ))}
            {/* Pad with placeholders so the grid doesn't collapse */}
            {Array.from({ length: PAGE_SIZE_DESKTOP - visibleSlice.length }).map((_, i) => (
              <div key={`placeholder-${i}`} className="hidden lg:block" />
            ))}
          </div>

          {testimonials.length > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrev}
                disabled={pageIndex === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-organic-terracotta/40 hover:text-organic-terracotta disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground"
                aria-label={t('previous')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <ol className="flex flex-1 items-center justify-center gap-2" role="tablist">
                {/* Mobile uses per-card dots; desktop uses per-page dots.
                    We render per-page dots since they're the canonical layout. */}
                {Array.from({ length: pageCount }).map((_, i) => {
                  const active = pageIndex >= i * PAGE_SIZE_DESKTOP &&
                    pageIndex < (i + 1) * PAGE_SIZE_DESKTOP;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-label={`${i + 1}`}
                        onClick={() => setPageIndex(i * PAGE_SIZE_DESKTOP)}
                        className={`h-2 rounded-full transition-all ${
                          active
                            ? 'w-6 bg-organic-terracotta'
                            : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                      />
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                onClick={handleNext}
                disabled={pageIndex >= testimonials.length - 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-organic-terracotta/40 hover:text-organic-terracotta disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground"
                aria-label={t('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      <GiveFeedbackModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        branding={branding}
      />
    </section>
  );
}

function TestimonialCard({
  testimonial,
  communityName,
}: {
  testimonial: ApprovedTestimonial;
  communityName: string;
}) {
  const t = useTranslations('Dashboard.testimonials');
  const initial = (
    testimonial.member.name?.trim()?.[0] ?? `${testimonial.member.organicId ?? '?'}`
  )
    .toString()
    .toUpperCase();

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-background/40 p-5">
      <div
        className="flex gap-0.5"
        role="img"
        aria-label={t('ratingLabel', { rating: testimonial.rating })}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < testimonial.rating
                ? 'fill-organic-terracotta text-organic-terracotta'
                : 'text-muted-foreground/30'
            }`}
            strokeWidth={1.5}
            aria-hidden
          />
        ))}
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
        {testimonial.member.avatarUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={testimonial.member.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          </>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-organic-terracotta/15 text-sm font-semibold text-organic-terracotta">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {testimonial.member.name ??
              `Member #${testimonial.member.organicId ?? '—'}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('card.memberAt', { community: communityName })}
          </p>
        </div>
      </div>
    </article>
  );
}
