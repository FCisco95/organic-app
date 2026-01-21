import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'pt-PT', 'zh-CN'] as const;
export const defaultLocale = 'en';

export const languageConfig = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt-PT', name: 'Português', flag: '🇵🇹' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
];

export const { Link, usePathname, useRouter, redirect } = createNavigation({
  locales,
  defaultLocale,
});
