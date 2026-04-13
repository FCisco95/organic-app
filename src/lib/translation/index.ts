export { DeepLProvider } from './deepl-provider';
export type { TranslationProvider, TranslationRequest, TranslationResult, SupportedLocale } from './types';
export { LOCALE_TO_DEEPL, DEEPL_TO_LOCALE } from './types';

import { DeepLProvider } from './deepl-provider';
import type { TranslationProvider } from './types';

let _provider: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (!_provider) {
    _provider = new DeepLProvider();
  }
  return _provider;
}

export function setTranslationProvider(provider: TranslationProvider): void {
  _provider = provider;
}
