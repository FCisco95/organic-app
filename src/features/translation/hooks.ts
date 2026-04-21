'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { fetchJson } from '@/lib/fetch-json';
import type { PostTranslation, TranslateResponse } from './types';

type TranslatableContentType = 'post' | 'proposal' | 'idea' | 'task';

interface ContentTranslateResponse {
  data: Record<string, string>;
  cached: boolean;
  sourceLocale: string;
}

const ROUTE_BY_TYPE: Record<TranslatableContentType, (id: string) => string> = {
  post: (id) => `/api/posts/${id}/translate`,
  proposal: (id) => `/api/proposals/${id}/translate`,
  idea: (id) => `/api/ideas/${id}/translate`,
  task: (id) => `/api/tasks/${id}/translate`,
};

export interface UseContentTranslationResult {
  translations: Record<string, string> | null;
  isTranslated: boolean;
  isLoading: boolean;
  error: string | null;
  translate: () => Promise<void>;
  showOriginal: () => void;
  shouldShowButton: boolean;
}

export function useContentTranslation(
  contentType: TranslatableContentType,
  contentId: string,
  detectedLanguage: string | null
): UseContentTranslationResult {
  const locale = useLocale();
  const [translations, setTranslations] = useState<Record<string, string> | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show button when content language differs from user's locale.
  // If detection hasn't run (null), show as fallback — user decides.
  const shouldShowButton =
    detectedLanguage !== null ? detectedLanguage !== locale : true;

  const translate = useCallback(async () => {
    if (translations) {
      setIsTranslated(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJson<ContentTranslateResponse>(
        ROUTE_BY_TYPE[contentType](contentId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocale: locale }),
        }
      );
      setTranslations(response.data);
      setIsTranslated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  }, [contentType, contentId, locale, translations]);

  const showOriginal = useCallback(() => {
    setIsTranslated(false);
  }, []);

  return {
    translations,
    isTranslated,
    isLoading,
    error,
    translate,
    showOriginal,
    shouldShowButton,
  };
}

/**
 * Thin post wrapper — reconstructs PostTranslation (title, body, threadParts)
 * from the flat {title, body, thread_part_N} response.
 */
export function usePostTranslation(
  postId: string,
  detectedLanguage: string | null
) {
  const base = useContentTranslation('post', postId, detectedLanguage);

  const translation: PostTranslation | null = base.translations
    ? {
        title: base.translations.title ?? '',
        body: base.translations.body ?? '',
        threadParts: extractThreadParts(base.translations),
      }
    : null;

  return {
    translation,
    isTranslated: base.isTranslated,
    isLoading: base.isLoading,
    error: base.error,
    translate: base.translate,
    showOriginal: base.showOriginal,
    shouldShowButton: base.shouldShowButton,
  };
}

export function useProposalTranslation(
  proposalId: string,
  detectedLanguage: string | null
) {
  return useContentTranslation('proposal', proposalId, detectedLanguage);
}

export function useIdeaTranslation(
  ideaId: string,
  detectedLanguage: string | null
) {
  return useContentTranslation('idea', ideaId, detectedLanguage);
}

export function useTaskTranslation(
  taskId: string,
  detectedLanguage: string | null
) {
  const base = useContentTranslation('task', taskId, detectedLanguage);

  const translation =
    base.translations !== null
      ? {
          title: base.translations.title ?? '',
          description: base.translations.description ?? '',
        }
      : null;

  return {
    translation,
    isTranslated: base.isTranslated,
    isLoading: base.isLoading,
    error: base.error,
    translate: base.translate,
    showOriginal: base.showOriginal,
    shouldShowButton: base.shouldShowButton,
  };
}

function extractThreadParts(
  translations: Record<string, string>
): PostTranslation['threadParts'] {
  const parts: { part_order: number; body: string }[] = [];
  for (const [key, value] of Object.entries(translations)) {
    const match = /^thread_part_(\d+)$/.exec(key);
    if (match) {
      parts.push({ part_order: Number(match[1]), body: value });
    }
  }
  if (parts.length === 0) return null;
  parts.sort((a, b) => a.part_order - b.part_order);
  return parts;
}

// Re-export types for backward compat
export type { PostTranslation, TranslateResponse };
