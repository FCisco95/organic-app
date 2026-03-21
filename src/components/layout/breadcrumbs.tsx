'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { routeSectionMap, routeLabelMap } from './nav-config';

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('Navigation');

  const crumbs = buildCrumbs(pathname, t);

  if (crumbs.length === 0) return null;

  // Mobile: show only current page name
  const currentPage = crumbs[crumbs.length - 1];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 mx-4">
      {/* Desktop breadcrumbs */}
      <ol className="hidden md:flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
              {isLast ? (
                <span className="font-semibold text-foreground truncate">{crumb.label}</span>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground/70 truncate">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: just page name */}
      <span className="md:hidden text-sm font-semibold text-foreground truncate block">
        {currentPage.label}
      </span>
    </nav>
  );
}

function buildCrumbs(
  pathname: string,
  t: (key: string) => string
): Crumb[] {
  // Home page — no breadcrumbs needed
  if (pathname === '/') return [];

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];

  // Add section header as first crumb (non-linked context label)
  const firstSegment = segments[0];
  const sectionKey = routeSectionMap[firstSegment];
  if (sectionKey) {
    crumbs.push({ label: t(sectionKey) });
  }

  // Build path crumbs
  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentPath += `/${seg}`;

    const labelKey = routeLabelMap[seg];
    if (labelKey) {
      const isLast = i === segments.length - 1;
      crumbs.push({
        label: t(labelKey),
        href: isLast ? undefined : currentPath,
      });
    } else {
      // Dynamic segment (ID) — show as "Detail"
      const isLast = i === segments.length - 1;
      crumbs.push({
        label: t('breadcrumbDetail'),
        href: isLast ? undefined : currentPath,
      });
    }
  }

  return crumbs;
}
