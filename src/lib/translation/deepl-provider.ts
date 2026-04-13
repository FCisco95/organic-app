import { logger } from '@/lib/logger';
import type { TranslationProvider, TranslationRequest, TranslationResult, SupportedLocale } from './types';
import { LOCALE_TO_DEEPL, DEEPL_TO_LOCALE } from './types';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2';

export class DeepLProvider implements TranslationProvider {
  readonly name = 'deepl-free';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.DEEPL_API_KEY ?? '';
    if (!this.apiKey) {
      logger.warn('DeepL API key not configured — translations will fail');
    }
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const targetLang = LOCALE_TO_DEEPL[request.targetLocale];
    if (!targetLang) {
      throw new Error(`Unsupported target locale: ${request.targetLocale}`);
    }

    const body = new URLSearchParams();
    for (const t of request.text) {
      body.append('text', t);
    }
    body.append('target_lang', targetLang);
    if (request.sourceLocale) {
      const sourceLang = LOCALE_TO_DEEPL[request.sourceLocale];
      if (sourceLang) {
        body.append('source_lang', sourceLang.split('-')[0]);
      }
    }

    const response = await fetch(`${DEEPL_API_URL}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('DeepL API error', { status: response.status, body: errorBody });
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      translations: data.translations.map((t: { text: string; detected_source_language: string }) => ({
        text: t.text,
        detectedSourceLanguage: t.detected_source_language,
      })),
    };
  }

  async detectLanguage(text: string): Promise<string> {
    const result = await this.translate({
      text: [text.slice(0, 200)],
      targetLocale: 'en',
    });
    const detected = result.translations[0]?.detectedSourceLanguage ?? 'EN';
    return DEEPL_TO_LOCALE[detected] ?? 'en';
  }
}
