'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { fetchJson } from '@/lib/fetch-json';

interface CommentTranslateResponse {
  data: { body: string };
  cached: boolean;
  sourceLocale: string;
}

export interface UseCommentTranslationResult {
  translation: string | null;
  isTranslated: boolean;
  isLoading: boolean;
  shouldShowButton: boolean;
  translate: () => Promise<void>;
  showOriginal: () => void;
}

export function useCommentTranslation(
  commentId: string,
  detectedLanguage: string | null = null
): UseCommentTranslationResult {
  const locale = useLocale();
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shouldShowButton =
    detectedLanguage !== null ? detectedLanguage !== locale : true;

  const translate = useCallback(async () => {
    if (translation) {
      setIsTranslated(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchJson<CommentTranslateResponse>(
        `/api/translate/comment/${commentId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocale: locale }),
        }
      );
      setTranslation(response.data.body);
      setIsTranslated(true);
    } catch {
      // Silently fail — comment translation is non-critical.
    } finally {
      setIsLoading(false);
    }
  }, [commentId, locale, translation]);

  const showOriginal = useCallback(() => {
    setIsTranslated(false);
  }, []);

  return {
    translation,
    isTranslated,
    isLoading,
    shouldShowButton,
    translate,
    showOriginal,
  };
}
