'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { LanguageSelector } from './language-selector';
import { languageConfig } from '@/i18n/navigation';

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleSelectLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <LanguageSelector
      languages={languageConfig}
      currentLanguageCode={locale}
      onSelectLanguage={handleSelectLanguage}
    />
  );
}
