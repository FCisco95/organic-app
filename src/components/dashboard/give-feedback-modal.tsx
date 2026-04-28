'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  submitTestimonialSchema,
} from '@/features/testimonials/schemas';
import { useSubmitTestimonial } from '@/features/testimonials/hooks';
import type { TenantBranding } from '@/lib/tenant/types';

interface GiveFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branding: TenantBranding;
}

export function GiveFeedbackModal({ open, onOpenChange, branding }: GiveFeedbackModalProps) {
  const t = useTranslations('Dashboard.testimonials.modal');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [quote, setQuote] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; quote?: string }>({});
  const submit = useSubmitTestimonial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = submitTestimonialSchema.safeParse({ rating, quote });
    if (!parsed.success) {
      const next: { rating?: string; quote?: string } = {};
      for (const err of parsed.error.errors) {
        const field = err.path[0];
        if (field === 'rating') next.rating = t('validationRating');
        else if (field === 'quote') {
          if (quote.trim().length < 10) next.quote = t('validationQuoteShort');
          else if (quote.length > 500) next.quote = t('validationQuoteLong');
        }
      }
      setErrors(next);
      return;
    }

    try {
      const result = await submit.mutateAsync(parsed.data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('successToast'));
      onOpenChange(false);
      setRating(0);
      setQuote('');
      setErrors({});
    } catch {
      toast.error(t('errorToast'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { community: branding.communityName })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('ratingLabel')}
            </label>
            <div
              className="flex gap-1"
              onMouseLeave={() => setHoverRating(0)}
              role="radiogroup"
              aria-label={t('ratingLabel')}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star`}
                    onClick={() => {
                      setRating(star);
                      if (errors.rating) setErrors({ ...errors, rating: undefined });
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    className="rounded p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:ring-offset-2"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        filled
                          ? 'fill-organic-terracotta text-organic-terracotta'
                          : 'text-muted-foreground/40'
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
            {errors.rating && (
              <p className="mt-1.5 text-xs text-red-500">{errors.rating}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="testimonial-quote"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t('quoteLabel')}
            </label>
            <textarea
              id="testimonial-quote"
              value={quote}
              onChange={(e) => {
                setQuote(e.target.value);
                if (errors.quote) setErrors({ ...errors, quote: undefined });
              }}
              maxLength={500}
              rows={4}
              placeholder={t('quotePlaceholder')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-organic-terracotta focus:outline-none focus:ring-2 focus:ring-organic-terracotta/20"
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.quote ? (
                <p className="text-xs text-red-500">{errors.quote}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground/70">
                {quote.length}/500
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="rounded-lg bg-organic-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-organic-terracotta-hover disabled:opacity-50"
            >
              {submit.isPending ? t('submitting') : t('submit')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
