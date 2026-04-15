'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { fetchJson } from '@/lib/fetch-json';
import type { PostTranslation, TranslateResponse } from './types';

export function usePostTranslation(
  postId: string,
  detectedLanguage: string | null
) {
  const locale = useLocale();
  const [translation, setTranslation] = useState<PostTranslation | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show translate button when post language differs from user's locale.
  // If detected_language is null (unknown), show the button as a fallback.
  const shouldShowButton =
    detectedLanguage !== null ? detectedLanguage !== locale : true;

  const translate = useCallback(async () => {
    if (translation) {
      // Already translated — just toggle back to translated view
      setIsTranslated(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJson<TranslateResponse>(
        `/api/posts/${postId}/translate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocale: locale }),
        }
      );
      setTranslation(response.data);
      setIsTranslated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  }, [postId, locale, translation]);

  const showOriginal = useCallback(() => {
    setIsTranslated(false);
  }, []);

  return {
    translation,
    isTranslated,
    isLoading,
    error,
    translate,
    showOriginal,
    shouldShowButton,
  };
}
