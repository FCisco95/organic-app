'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { useCampaigns } from '@/features/campaigns';
import type { Campaign } from '@/features/campaigns';
import { Link } from '@/i18n/navigation';

function formatCountdown(target: string | null | undefined): string | null {
  if (!target) return null;
  const diffMs = new Date(target).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes}m`;
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    setCountdown(formatCountdown(campaign.ends_at));
    if (!campaign.ends_at) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(campaign.ends_at));
    }, 60_000);
    return () => clearInterval(interval);
  }, [campaign.ends_at]);

  const hasLink = !!campaign.cta_link;
  const isInternal = campaign.cta_link?.startsWith('/');

  const cardContent = (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl h-full flex flex-col',
        'hover:scale-[1.005] transition-transform duration-200',
        !campaign.banner_url && 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      )}
    >
      {/* Banner image or gradient with icon */}
      {campaign.banner_url ? (
        <div className="relative h-48 sm:h-56 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      ) : (
        <div className="relative h-24 sm:h-28 overflow-hidden bg-gradient-to-br from-organic-terracotta/20 via-transparent to-purple-500/10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-organic-terracotta-lightest0/10 blur-2xl" />
          {campaign.icon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl sm:text-5xl">{campaign.icon}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
          {campaign.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-2">
          {campaign.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          {/* Countdown */}
          {countdown && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-organic-terracotta" />
              <span>Ends in {countdown}</span>
            </div>
          )}
          {!countdown && campaign.ends_at && (
            <span className="text-xs font-medium text-emerald-500">Live now</span>
          )}
          {!campaign.ends_at && (
            <span className="text-xs font-medium text-emerald-500">Live now</span>
          )}

          {/* CTA */}
          {hasLink && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-organic-terracotta group-hover:text-[#E8845C] transition-colors">
              {campaign.cta_text || 'Learn more'}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (hasLink && isInternal) {
    return (
      <Link href={campaign.cta_link!} className="block group h-full">
        {cardContent}
      </Link>
    );
  }

  if (hasLink) {
    return (
      <a href={campaign.cta_link!} target="_blank" rel="noopener noreferrer" className="block group h-full">
        {cardContent}
      </a>
    );
  }

  return <div className="h-full">{cardContent}</div>;
}

export function CampaignCarousel() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, Math.max(0, campaigns.length - 1)));
  }, [campaigns.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateActiveIndex, { passive: true });
    return () => el.removeEventListener('scroll', updateActiveIndex);
  }, [updateActiveIndex]);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
  }, []);

  // Auto-advance every 8 seconds
  useEffect(() => {
    if (isPaused || campaigns.length <= 1) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      const next = (activeIndex + 1) % campaigns.length;
      scrollTo(next);
    }, 8000);

    return () => clearInterval(timer);
  }, [activeIndex, isPaused, scrollTo, campaigns.length]);

  // Don't render if no campaigns or loading
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-muted h-48 sm:h-56" />
    );
  }

  if (campaigns.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Scroll arrows — desktop only, hidden if single card */}
      {campaigns.length > 1 && (
        <>
          <button
            onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
            className={cn(
              'hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-md hover:scale-105 transition-transform',
              activeIndex === 0 && 'opacity-30 pointer-events-none'
            )}
            aria-label="Previous campaign"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={() => scrollTo(Math.min(campaigns.length - 1, activeIndex + 1))}
            className={cn(
              'hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-md hover:scale-105 transition-transform',
              activeIndex === campaigns.length - 1 && 'opacity-30 pointer-events-none'
            )}
            aria-label="Next campaign"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </>
      )}

      {/* Cards container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
      >
        {campaigns.map((campaign, i) => (
          <div
            key={campaign.id}
            className="min-w-full snap-center flex-shrink-0 px-1 sm:px-4 opacity-0 animate-fade-up"
            style={{ animationDelay: `${200 + i * 80}ms` }}
          >
            <CampaignCard campaign={campaign} />
          </div>
        ))}
      </div>

      {/* Dot indicators — hidden if single card */}
      {campaigns.length > 1 && (
        <div className="flex justify-center gap-2 mt-1">
          {campaigns.map((_, i) => (
            <button
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                activeIndex === i ? 'w-5 bg-organic-terracotta-lightest0' : 'w-2 bg-border'
              )}
              onClick={() => scrollTo(i)}
              aria-label={`Go to campaign ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
