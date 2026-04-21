'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import {
  DEFAULT_TRANSLATION_SETTINGS,
  type TranslationSettings,
} from '@/features/settings/schemas';

interface PublicFlagsResponse {
  translation_settings: TranslationSettings;
}

export const translationFlagsKeys = {
  all: ['translation-flags'] as const,
};

export function useTranslationFlags() {
  return useQuery({
    queryKey: translationFlagsKeys.all,
    queryFn: async (): Promise<TranslationSettings> => {
      const json = await fetchJson<PublicFlagsResponse>('/api/settings/public-flags');
      return json.translation_settings;
    },
    staleTime: 5 * 60_000,
    // Translate buttons fall back to "allowed" while flags are loading so
    // they don't flicker in and out. The server-side gate blocks anything
    // that slips through before the fetch resolves.
    placeholderData: DEFAULT_TRANSLATION_SETTINGS,
  });
}

export type TranslationContentKey = keyof TranslationSettings;

export function useTranslationFlag(
  contentType: TranslationContentKey
): boolean {
  const { data } = useTranslationFlags();
  return (data ?? DEFAULT_TRANSLATION_SETTINGS)[contentType];
}
