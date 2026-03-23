'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PageGuideModal } from './page-guide-modal';
import { getGuideForRoute } from '@/lib/page-guides';

export function PageGuideButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Strip locale prefix (e.g. /en/tasks → /tasks, /en → /)
  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  const guide = getGuideForRoute(route);
  if (!guide) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/70 backdrop-blur text-background shadow-lg hover:bg-foreground transition-colors"
        aria-label="Page guide"
      >
        <Info className="h-5 w-5" />
      </button>

      <PageGuideModal
        open={open}
        onOpenChange={setOpen}
        steps={guide.steps}
        pageTitle={guide.title}
      />
    </>
  );
}
