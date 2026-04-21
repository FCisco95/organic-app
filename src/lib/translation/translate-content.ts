/**
 * translateContent() — shared core for every translate route.
 *
 * Route handlers own: auth, rate limiting, content fetching, and cache
 * invalidation on edits. This helper owns: cache lookup, partial-hit handling,
 * provider call, cache write, and character accounting.
 */

import { logger } from '@/lib/logger';
import { DEEPL_TO_LOCALE } from './types';
import type { SupportedLocale, TranslationProvider } from './types';

export type TranslatableContentType =
  | 'post'
  | 'comment'
  | 'task_comment'
  | 'proposal'
  | 'idea'
  | 'task';

export interface TranslationField {
  name: string;
  text: string;
}

export interface ContentTranslationConfig {
  contentType: TranslatableContentType;
  contentId: string;
  fields: TranslationField[];
  sourceLocale: string | null;
  targetLocale: SupportedLocale;
}

/**
 * Minimal surface of the Supabase service client we actually use here.
 * Passed via `TranslationRuntime` so tests can inject fakes without pulling
 * in next/headers or the full Supabase SDK.
 */
export interface TranslationServiceClient {
  from(table: 'content_translations'): {
    select: (cols: string) => {
      eq: (c: string, v: unknown) => {
        eq: (c: string, v: unknown) => {
          eq: (c: string, v: unknown) => {
            in: (c: string, v: unknown[]) => Promise<{ data: unknown }>;
          };
        };
      };
    };
    upsert: (
      rows: unknown[],
      opts: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
}

export interface TranslationRuntime {
  serviceClient: TranslationServiceClient;
  provider: TranslationProvider;
}

export interface ContentTranslationResult {
  translations: Record<string, string>;
  /** True iff no provider call was made (full cache hit or source === target). */
  cached: boolean;
  sourceLocale: string;
  providerCharsUsed: number;
}

interface CachedRow {
  field_name: string;
  translated_text: string;
  source_locale: string;
}

interface CacheRowInsert {
  content_type: string;
  content_id: string;
  field_name: string;
  source_locale: string;
  target_locale: string;
  translated_text: string;
  provider: string;
  provider_chars_used: number;
}

export async function translateContent(
  config: ContentTranslationConfig
): Promise<ContentTranslationResult> {
  // Lazy-import production dependencies so this module can be loaded in
  // test environments without dragging in next/headers.
  const { createServiceClient } = await import('@/lib/supabase/server');
  const { getTranslationProvider } = await import('./');
  return translateContentWithRuntime(
    {
      serviceClient: createServiceClient() as unknown as TranslationServiceClient,
      provider: getTranslationProvider(),
    },
    config
  );
}

export async function translateContentWithRuntime(
  runtime: TranslationRuntime,
  config: ContentTranslationConfig
): Promise<ContentTranslationResult> {
  const { contentType, contentId, fields, sourceLocale, targetLocale } = config;

  if (fields.length === 0) {
    return {
      translations: {},
      cached: true,
      sourceLocale: sourceLocale ?? targetLocale,
      providerCharsUsed: 0,
    };
  }

  // Short-circuit: already in target language — no cache lookup, no provider call.
  if (sourceLocale && sourceLocale === targetLocale) {
    const passthrough: Record<string, string> = {};
    for (const field of fields) passthrough[field.name] = field.text;
    return {
      translations: passthrough,
      cached: true,
      sourceLocale,
      providerCharsUsed: 0,
    };
  }

  const { serviceClient, provider } = runtime;
  const fieldNames = fields.map((f) => f.name);

  const { data: cachedRows } = await (serviceClient as any)
    .from('content_translations')
    .select('field_name, translated_text, source_locale')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('target_locale', targetLocale)
    .in('field_name', fieldNames);

  const cache = new Map<string, CachedRow>();
  for (const row of (cachedRows ?? []) as CachedRow[]) {
    cache.set(row.field_name, row);
  }

  const translations: Record<string, string> = {};
  const missingFields: TranslationField[] = [];
  let anyCachedSourceLocale: string | null = null;

  for (const field of fields) {
    const hit = cache.get(field.name);
    if (hit) {
      translations[field.name] = hit.translated_text;
      anyCachedSourceLocale = hit.source_locale;
    } else {
      missingFields.push(field);
    }
  }

  if (missingFields.length === 0) {
    return {
      translations,
      cached: true,
      sourceLocale: anyCachedSourceLocale ?? sourceLocale ?? 'und',
      providerCharsUsed: 0,
    };
  }

  const providerResult = await provider.translate({
    text: missingFields.map((f) => f.text),
    targetLocale,
    sourceLocale: (sourceLocale as SupportedLocale | null) ?? undefined,
  });

  const detectedDeeplLang =
    providerResult.translations[0]?.detectedSourceLanguage ?? 'EN';
  const resolvedSourceLocale =
    sourceLocale ??
    anyCachedSourceLocale ??
    DEEPL_TO_LOCALE[detectedDeeplLang] ??
    'en';

  const cacheRows: CacheRowInsert[] = [];
  let providerCharsUsed = 0;

  missingFields.forEach((field, i) => {
    const translated = providerResult.translations[i]?.text ?? field.text;
    translations[field.name] = translated;
    const charsUsed = field.text.length;
    providerCharsUsed += charsUsed;
    cacheRows.push({
      content_type: contentType,
      content_id: contentId,
      field_name: field.name,
      source_locale: resolvedSourceLocale,
      target_locale: targetLocale,
      translated_text: translated,
      provider: provider.name,
      provider_chars_used: charsUsed,
    });
  });

  // Fire-and-forget cache upsert — users shouldn't wait on write latency.
  void (serviceClient as any)
    .from('content_translations')
    .upsert(cacheRows, {
      onConflict: 'content_type,content_id,field_name,target_locale',
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        logger.error('Failed to cache translation', {
          contentType,
          contentId,
          targetLocale,
          error: error.message,
        });
      }
    });

  return {
    translations,
    cached: false,
    sourceLocale: resolvedSourceLocale,
    providerCharsUsed,
  };
}
