'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { fetchJson } from '@/lib/fetch-json';

interface CommentTranslateResponse {
  data: { body: string };
  cached: boolean;
}

export function useCommentTranslation(postId: string, commentId: string) {
  const locale = useLocale();
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const translate = useCallback(async () => {
    if (translation) {
      setIsTranslated(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchJson<CommentTranslateResponse>(
        `/api/posts/${postId}/comments/${commentId}/translate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocale: locale }),
        }
      );
      setTranslation(response.data.body);
      setIsTranslated(true);
    } catch {
      // Silently fail — comment translation is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [postId, commentId, locale, translation]);

  const showOriginal = useCallback(() => {
    setIsTranslated(false);
  }, []);

  return { translation, isTranslated, isLoading, translate, showOriginal };
}
