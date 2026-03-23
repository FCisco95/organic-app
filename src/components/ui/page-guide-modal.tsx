'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GuideStep } from '@/lib/page-guides/types';

interface PageGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: GuideStep[];
  pageTitle: string;
}

export function PageGuideModal({ open, onOpenChange, steps, pageTitle }: PageGuideModalProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to first step when modal opens
  useEffect(() => {
    if (open) {
      setCurrent(0);
      setDirection(null);
    }
  }, [open]);

  const goTo = useCallback(
    (index: number, dir: 'left' | 'right') => {
      if (index < 0 || index >= steps.length) return;
      setDirection(dir);
      setCurrent(index);
    },
    [steps.length]
  );

  const prev = useCallback(() => goTo(current - 1, 'left'), [current, goTo]);
  const next = useCallback(() => goTo(current + 1, 'right'), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, prev, next]);

  // Touch swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    const threshold = 50;
    if (touchDeltaX.current > threshold) prev();
    else if (touchDeltaX.current < -threshold) next();
    touchDeltaX.current = 0;
  };

  const step = steps[current];
  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[95vw] h-[85vh] sm:h-[80vh] max-h-[700px] p-0 bg-white border-gray-200 rounded-2xl overflow-hidden flex flex-col"
        aria-describedby="page-guide-description"
      >
        <DialogTitle className="sr-only">{pageTitle} Guide</DialogTitle>
        <p id="page-guide-description" className="sr-only">
          Step-by-step guide for the {pageTitle} page
        </p>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-500 font-sans">
            Step {current + 1} of {steps.length}
          </span>
          <h3 className="text-base font-semibold text-gray-900 font-sans">
            {pageTitle}
          </h3>
        </div>

        {/* Carousel area */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Visual area — top 60% */}
          <div className="h-[58%] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6 sm:p-8 overflow-hidden relative">
            <div
              key={current}
              className={cn(
                'w-full h-full flex items-center justify-center animate-in duration-300',
                direction === 'right' && 'slide-in-from-right-4 fade-in-0',
                direction === 'left' && 'slide-in-from-left-4 fade-in-0',
                !direction && 'fade-in-0'
              )}
            >
              {step.visual}
            </div>
          </div>

          {/* Text area — bottom 40% */}
          <div className="h-[42%] px-6 sm:px-10 py-5 sm:py-6 flex flex-col justify-center">
            <div
              key={`text-${current}`}
              className={cn(
                'animate-in duration-300 fade-in-0',
                direction === 'right' && 'slide-in-from-right-2',
                direction === 'left' && 'slide-in-from-left-2'
              )}
            >
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900 font-sans mb-2">
                {step.title}
              </h4>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-sans">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer: arrows + dots */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {/* Prev arrow */}
          <button
            onClick={prev}
            disabled={current === 0}
            className="flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? 'right' : 'left')}
                className={cn(
                  'h-2 rounded-full transition-all duration-200',
                  current === i
                    ? 'w-5 bg-orange-500'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Next arrow */}
          <button
            onClick={current === steps.length - 1 ? () => onOpenChange(false) : next}
            className={cn(
              'flex items-center justify-center h-9 rounded-full border transition-colors',
              current === steps.length - 1
                ? 'px-4 bg-orange-500 border-orange-500 text-white hover:bg-orange-600 font-sans text-sm font-medium'
                : 'w-9 border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
            aria-label={current === steps.length - 1 ? 'Close guide' : 'Next step'}
          >
            {current === steps.length - 1 ? (
              'Got it'
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
