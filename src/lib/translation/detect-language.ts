import { franc } from 'franc';
import type { SupportedLocale } from './types';

const FRANC_TO_LOCALE: Record<string, SupportedLocale> = {
  eng: 'en',
  cmn: 'zh-CN',
  zho: 'zh-CN',
  por: 'pt-PT',
};

export function mapFrancToLocale(francCode: string): SupportedLocale | null {
  return FRANC_TO_LOCALE[francCode] ?? null;
}

export function detectLanguage(text: string): SupportedLocale | null {
  if (!text || text.length < 20) {
    return null;
  }

  const detected = franc(text, {
    only: ['eng', 'cmn', 'zho', 'por'],
    minLength: 10,
  });

  if (detected === 'und') {
    return null;
  }

  return mapFrancToLocale(detected);
}
