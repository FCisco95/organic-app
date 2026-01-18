'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { ChangeEvent } from 'react';

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="bg-gray-800 text-white p-2 rounded"
    >
      <option value="en">English</option>
      <option value="pt-PT">Português</option>
      <option value="zh-CN">中文</option>
    </select>
  );
}
