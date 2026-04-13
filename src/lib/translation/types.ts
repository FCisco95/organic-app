export type SupportedLocale = 'en' | 'pt-PT' | 'zh-CN';

export interface TranslationRequest {
  text: string[];
  targetLocale: SupportedLocale;
  sourceLocale?: SupportedLocale;
}

export interface TranslationResult {
  translations: {
    text: string;
    detectedSourceLanguage: string;
  }[];
}

export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResult>;
  detectLanguage(text: string): Promise<string>;
  readonly name: string;
}

export const LOCALE_TO_DEEPL: Record<SupportedLocale, string> = {
  'en': 'EN',
  'pt-PT': 'PT-PT',
  'zh-CN': 'ZH-HANS',
};

export const DEEPL_TO_LOCALE: Record<string, SupportedLocale> = {
  'EN': 'en',
  'PT': 'pt-PT',
  'PT-PT': 'pt-PT',
  'ZH': 'zh-CN',
  'ZH-HANS': 'zh-CN',
};
