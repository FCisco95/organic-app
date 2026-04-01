'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InfoSection {
  title: string;
  points: string[];
}

interface InfoButtonProps {
  sections: InfoSection[];
}

/** Parse **bold** markers in a string into React nodes */
function renderRichText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-foreground font-medium">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function InfoButton({ sections }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
    setActiveSection(0);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        // Check if user clicked the toggle button itself (handled separately)
        const btn = document.getElementById('info-button-trigger');
        if (btn && btn.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Update active section on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth
        : 280;
      const idx = Math.round(el.scrollLeft / cardWidth);
      setActiveSection(Math.min(idx, sections.length - 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [sections.length, open]);

  const scrollToSection = (index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        id="info-button-trigger"
        onClick={toggle}
        className="fixed bottom-20 right-6 z-40 sm:bottom-6 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/70 backdrop-blur text-background shadow-lg hover:bg-foreground transition-colors"
        aria-label="Page information"
      >
        <Info className="h-5 w-5" />
      </button>

      {/* Floating popup card */}
      {open && (
        <div
          ref={popupRef}
          className="fixed bottom-[calc(5rem+0.5rem)] right-6 sm:bottom-[calc(3.5rem+0.5rem)] z-50 w-[calc(100vw-3rem)] max-w-sm rounded-2xl bg-card border border-border shadow-2xl animate-fade-up-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              {sections[activeSection]?.title ?? ''}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Horizontal scroll sections */}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          >
            {sections.map((section, i) => (
              <div
                key={i}
                className="min-w-full snap-center px-4 py-4 flex-shrink-0"
              >
                <h4 className="text-xs font-semibold uppercase tracking-wider text-organic-terracotta mb-2">
                  {section.title}
                </h4>
                <ul className="space-y-1.5">
                  {section.points.map((point, j) => (
                    <li
                      key={j}
                      className="text-sm text-muted-foreground leading-relaxed flex gap-2"
                    >
                      <span className="text-organic-terracotta shrink-0 mt-0.5">&#8226;</span>
                      <span>{renderRichText(point)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          {sections.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-3">
              {sections.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToSection(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    activeSection === i
                      ? 'w-4 bg-organic-terracotta-lightest0'
                      : 'w-1.5 bg-border hover:bg-muted-foreground/30'
                  )}
                  aria-label={`Go to section ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
