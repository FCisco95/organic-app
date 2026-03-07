'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  ScrollText,
  CheckSquare,
  Timer,
  BarChart3,
  Landmark,
  Trophy,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface CarouselCard {
  id: string;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  fomoKey: string;
  icon: React.ElementType;
  href: string;
  glow?: boolean;
}

const CARDS: CarouselCard[] = [
  {
    id: 'proposals',
    titleKey: 'carouselProposalsTitle',
    descKey: 'carouselProposalsDesc',
    ctaKey: 'carouselProposalsCta',
    fomoKey: 'carouselProposalsFomo',
    icon: ScrollText,
    href: '/proposals',
    glow: true,
  },
  {
    id: 'tasks',
    titleKey: 'carouselTasksTitle',
    descKey: 'carouselTasksDesc',
    ctaKey: 'carouselTasksCta',
    fomoKey: 'carouselTasksFomo',
    icon: CheckSquare,
    href: '/tasks',
  },
  {
    id: 'sprints',
    titleKey: 'carouselSprintsTitle',
    descKey: 'carouselSprintsDesc',
    ctaKey: 'carouselSprintsCta',
    fomoKey: 'carouselSprintsFomo',
    icon: Timer,
    href: '/sprints',
  },
  {
    id: 'analytics',
    titleKey: 'carouselAnalyticsTitle',
    descKey: 'carouselAnalyticsDesc',
    ctaKey: 'carouselAnalyticsCta',
    fomoKey: 'carouselAnalyticsFomo',
    icon: BarChart3,
    href: '/analytics',
  },
  {
    id: 'treasury',
    titleKey: 'carouselTreasuryTitle',
    descKey: 'carouselTreasuryDesc',
    ctaKey: 'carouselTreasuryCta',
    fomoKey: 'carouselTreasuryFomo',
    icon: Landmark,
    href: '/treasury',
    glow: true,
  },
  {
    id: 'leaderboard',
    titleKey: 'carouselLeaderboardTitle',
    descKey: 'carouselLeaderboardDesc',
    ctaKey: 'carouselLeaderboardCta',
    fomoKey: 'carouselLeaderboardFomo',
    icon: Trophy,
    href: '/leaderboard',
  },
];

export function FeatureCarousel() {
  const t = useTranslations('Home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, CARDS.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateActiveIndex, { passive: true });
    return () => el.removeEventListener('scroll', updateActiveIndex);
  }, [updateActiveIndex]);

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
  };

  const scroll = (direction: 'left' | 'right') => {
    const next = direction === 'left'
      ? Math.max(0, activeIndex - 1)
      : Math.min(CARDS.length - 1, activeIndex + 1);
    scrollTo(next);
  };

  return (
    <div className="relative">
      {/* Scroll arrows -- desktop only */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          'hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-md hover:scale-105 transition-transform',
          activeIndex === 0 && 'opacity-30 pointer-events-none'
        )}
        aria-label="Previous card"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <button
        onClick={() => scroll('right')}
        className={cn(
          'hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-md hover:scale-105 transition-transform',
          activeIndex === CARDS.length - 1 && 'opacity-30 pointer-events-none'
        )}
        aria-label="Next card"
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>

      {/* Cards container -- 1 card at a time, big and floating */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
      >
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="min-w-full snap-center flex-shrink-0 px-1 sm:px-4 opacity-0 animate-fade-up"
              style={{ animationDelay: `${240 + i * 80}ms` }}
            >
              <Link href={card.href} className="block group">
                <div
                  className={cn(
                    'rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl h-full flex flex-col hover:scale-[1.01] transition-transform duration-200',
                    card.glow && 'animate-glow-pulse'
                  )}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-orange-500 transition-colors">
                      {t(card.titleKey)}
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex-1">
                    {t(card.descKey)}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-orange-500 uppercase tracking-wider">
                    {t(card.fomoKey)}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-orange-500 transition-colors">
                    {t(card.ctaKey)}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-1">
        {CARDS.map((_, i) => (
          <button
            key={i}
            className={cn(
              'h-2 rounded-full transition-all duration-200',
              activeIndex === i ? 'w-5 bg-orange-500' : 'w-2 bg-border'
            )}
            onClick={() => scrollTo(i)}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
