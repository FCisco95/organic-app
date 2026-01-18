import {createNavigation} from 'next-intl/navigation';

export const locales = ['en', 'pt-PT', 'zh-CN'] as const;
export const defaultLocale = 'en';

export const {Link, usePathname, useRouter, redirect} = createNavigation({
  locales,
  defaultLocale,
});
