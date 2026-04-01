'use client';

import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageGuideModal } from './page-guide-modal';
import { getGuideForRoute } from '@/lib/page-guides';
import type { GuideStep } from '@/lib/page-guides/types';

export function PageGuideButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('PageGuides');

  // Strip locale prefix (e.g. /en/tasks → /tasks, /pt-PT/ideas → /ideas, /zh-CN → /)
  const route = pathname.replace(/^\/[a-z]{2}(-[A-Za-z]{2,})?(?=\/|$)/, '') || '/';

  const guide = getGuideForRoute(route);

  // Merge translated titles/descriptions with the guide's JSX visuals
  const translatedSteps = useMemo<GuideStep[]>(() => {
    if (!guide) return [];
    if (!guide.i18nSection) return guide.steps;

    return guide.steps.map((step, i) => {
      const stepNum = i + 1;
      const section = guide.i18nSection!;
      const titleKey = `${section}.step${stepNum}Title`;
      const descKey = `${section}.step${stepNum}Desc`;

      return {
        ...step,
        title: t.has(titleKey) ? t(titleKey) : step.title,
        description: t.has(descKey) ? t(descKey) : step.description,
      };
    });
  }, [guide, t]);

  if (!guide) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/70 backdrop-blur text-background shadow-lg hover:bg-foreground transition-colors"
        aria-label="Page guide"
      >
        <Info className="h-5 w-5" />
      </button>

      <PageGuideModal
        open={open}
        onOpenChange={setOpen}
        steps={translatedSteps}
        pageTitle={guide.title}
      />
    </>
  );
}
