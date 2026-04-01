'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { getSidebarNavSections, type NavItem } from './nav-config';
import { CheckSquare, Vote, Lightbulb } from 'lucide-react';

interface PaletteItem {
  id: string;
  label: string;
  icon: NavItem['icon'];
  href: string;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const t = useTranslations('Navigation');
  const router = useRouter();

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

  const sections = useMemo(
    () =>
      getSidebarNavSections({
        isAuthenticated: !!user,
        hasOrganicId: !!profile?.organic_id,
        isAdminOrCouncil,
        isAdmin: profile?.role === 'admin',
      }),
    [user, profile, isAdminOrCouncil]
  );

  // Build palette items: pages + actions
  const allItems = useMemo(() => {
    const pages: PaletteItem[] = [
      ...sections.main.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        icon: item.icon,
        href: item.href,
        group: t('commandPalettePages'),
      })),
      ...sections.admin.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        icon: item.icon,
        href: item.href,
        group: t('commandPalettePages'),
      })),
      ...sections.utility.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        icon: item.icon,
        href: item.href,
        group: t('commandPalettePages'),
      })),
    ];

    const actions: PaletteItem[] = [];
    // Add quick actions based on permissions
    if (user) {
      actions.push({
        id: 'action-new-proposal',
        label: t('actionNewProposal'),
        icon: Vote,
        href: '/proposals/new',
        group: t('commandPaletteActions'),
      });
      actions.push({
        id: 'action-new-idea',
        label: t('actionNewIdea'),
        icon: Lightbulb,
        href: '/ideas/new',
        group: t('commandPaletteActions'),
      });
    }
    if (profile?.organic_id) {
      actions.push({
        id: 'action-new-task',
        label: t('actionNewTask'),
        icon: CheckSquare,
        href: '/tasks/new',
        group: t('commandPaletteActions'),
      });
    }

    return [...pages, ...actions];
  }, [sections, t, user, profile]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(lowerQuery));
  }, [allItems, query]);

  // Group the filtered results
  const grouped = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filtered]);

  // Flatten for keyboard nav
  const flatFiltered = useMemo(() => {
    const result: PaletteItem[] = [];
    for (const items of Object.values(grouped)) {
      result.push(...items);
    }
    return result;
  }, [grouped]);

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus the input after dialog animation
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const navigate = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(flatFiltered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatFiltered.length) % Math.max(flatFiltered.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatFiltered[activeIndex]) {
          navigate(flatFiltered[activeIndex]);
        }
      }
    },
    [flatFiltered, activeIndex, navigate]
  );

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  let itemCounter = 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('commandPaletteSearch')}</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-sidebar-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('commandPaletteSearch')}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-sidebar-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-72">
          <div ref={listRef} className="py-2">
            {flatFiltered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-sidebar-muted-foreground">
                {t('commandPaletteNoResults')}
              </p>
            ) : (
              Object.entries(grouped).map(([groupLabel, items]) => (
                <div key={groupLabel}>
                  <div className="px-4 pt-2 pb-1">
                    <span className="text-[10px] font-medium tracking-widest uppercase text-sidebar-muted-foreground">
                      {groupLabel}
                    </span>
                  </div>
                  {items.map((item) => {
                    const idx = itemCounter++;
                    const isActive = idx === activeIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-active={isActive}
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-muted-foreground hover:bg-sidebar-muted'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/** Trigger button for the top bar */
export function CommandPaletteTrigger({ onClick }: { onClick?: () => void }) {
  const t = useTranslations('Navigation');

  const handleClick = useCallback(() => {
    // Simulate Cmd+K keypress to open the palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
    onClick?.();
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={t('commandPaletteSearch')}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="text-xs">{t('commandPaletteSearch')}</span>
      <kbd className="ml-1 rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
        K
      </kbd>
    </button>
  );
}
