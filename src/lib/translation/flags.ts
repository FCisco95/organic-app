import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_TRANSLATION_SETTINGS,
  translationSettingsSchema,
  type TranslationSettings,
} from '@/features/settings/schemas';
import { logger } from '@/lib/logger';

export type TranslationContentKey = keyof TranslationSettings;

/**
 * Read the org-level translation flags. Returns defaults on any error so a
 * transient DB hiccup never blocks translate calls — but the source of truth
 * is the orgs row that the Translation admin tab writes to.
 */
export async function getTranslationFlags(
  supabase: SupabaseClient
): Promise<TranslationSettings> {
  try {
    const { data, error } = await supabase
      .from('orgs')
      .select('translation_settings')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_TRANSLATION_SETTINGS;
    }

    const parsed = translationSettingsSchema.safeParse(
      (data as { translation_settings: unknown }).translation_settings
    );
    return parsed.success ? parsed.data : DEFAULT_TRANSLATION_SETTINGS;
  } catch (err) {
    logger.error('getTranslationFlags error:', err);
    return DEFAULT_TRANSLATION_SETTINGS;
  }
}

export async function isTranslationEnabled(
  supabase: SupabaseClient,
  key: TranslationContentKey
): Promise<boolean> {
  const flags = await getTranslationFlags(supabase);
  return flags[key];
}
