import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Gift,
  Home,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Scale,
  Settings,
  Sparkles,
  Trophy,
  User,
  Vote,
  Wallet,
  Zap,
} from 'lucide-react';

export interface NavContext {
  isAuthenticated: boolean;
  hasOrganicId: boolean;
  isAdminOrCouncil: boolean;
  isAdmin: boolean;
}

export interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  icon: LucideIcon;
  shortcutHint?: string;
}

export interface NavGroup {
  id: string;
  labelKey: string;
  items: NavItem[];
}

export interface NavSections {
  main: NavItem[];
  groups: NavGroup[];
  admin: NavItem[];
  utility: NavItem[];
}

/**
 * All main nav items with their group assignment.
 * Group IDs: overview, work, governance, social
 */
const mainItemDefs: (NavItem & { groupId: string; showWhen?: (ctx: NavContext) => boolean })[] = [
  // Overview
  { groupId: 'overview', id: 'home', href: '/', labelKey: 'home', icon: Home, shortcutHint: 'G H' },
  {
    groupId: 'overview',
    id: 'analytics',
    href: '/analytics',
    labelKey: 'analytics',
    icon: BarChart3,
    shortcutHint: 'G A',
  },
  {
    groupId: 'overview',
    id: 'treasury',
    href: '/treasury',
    labelKey: 'treasury',
    icon: Wallet,
  },
  // Work
  {
    groupId: 'work',
    id: 'tasks',
    href: '/tasks',
    labelKey: 'tasks',
    icon: CheckSquare,
    shortcutHint: 'G T',
    showWhen: (ctx) => ctx.hasOrganicId,
  },
  {
    groupId: 'work',
    id: 'templates',
    href: '/tasks/templates',
    labelKey: 'templates',
    icon: FileText,
    showWhen: (ctx) => ctx.isAdminOrCouncil,
  },
  {
    groupId: 'work',
    id: 'sprints',
    href: '/sprints',
    labelKey: 'sprints',
    icon: Zap,
    showWhen: (ctx) => ctx.hasOrganicId,
  },
  // Governance
  {
    groupId: 'governance',
    id: 'proposals',
    href: '/proposals',
    labelKey: 'proposals',
    icon: Vote,
    shortcutHint: 'G P',
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'governance',
    id: 'ideas',
    href: '/ideas',
    labelKey: 'ideas',
    icon: Lightbulb,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'governance',
    id: 'disputes',
    href: '/disputes',
    labelKey: 'disputes',
    icon: Scale,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  // Social
  {
    groupId: 'social',
    id: 'posts',
    href: '/posts',
    labelKey: 'posts',
    icon: MessageSquare,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'social',
    id: 'community',
    href: '/community',
    labelKey: 'community',
    icon: Trophy,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'social',
    id: 'quests',
    href: '/quests',
    labelKey: 'refAndQuests',
    icon: Sparkles,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'social',
    id: 'rewards',
    href: '/rewards',
    labelKey: 'rewards',
    icon: Gift,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'social',
    id: 'notifications',
    href: '/notifications',
    labelKey: 'notifications',
    icon: Bell,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
];

const groupDefs: { id: string; labelKey: string }[] = [
  { id: 'overview', labelKey: 'sectionOverview' },
  { id: 'work', labelKey: 'sectionWork' },
  { id: 'governance', labelKey: 'sectionGovernance' },
  { id: 'social', labelKey: 'sectionSocial' },
];

export function getSidebarNavSections(context: NavContext): NavSections {
  const { isAdmin, isAdminOrCouncil } = context;

  // Filter visible items
  const visibleItems = mainItemDefs.filter((item) => {
    if (item.showWhen) return item.showWhen(context);
    return true;
  });

  // Build flat main list (backwards compat)
  const main: NavItem[] = visibleItems.map(({ groupId: _g, showWhen: _s, ...item }) => item);

  // Build grouped structure
  const groups: NavGroup[] = groupDefs
    .map((group) => ({
      id: group.id,
      labelKey: group.labelKey,
      items: visibleItems
        .filter((item) => item.groupId === group.id)
        .map(({ groupId: _g, showWhen: _s, ...item }) => item),
    }))
    .filter((group) => group.items.length > 0);

  const admin: NavItem[] = [
    {
      id: 'adminDashboard',
      href: '/admin',
      labelKey: 'adminDashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'submissions',
      href: '/admin/submissions',
      labelKey: 'submissions',
      icon: ClipboardCheck,
    },
    { id: 'adminRewards', href: '/admin/rewards', labelKey: 'adminRewards', icon: Gift },
    { id: 'settings', href: '/admin/settings', labelKey: 'settings', icon: Settings },
  ].filter((item) => {
    if (item.id === 'settings') return isAdmin;
    return isAdminOrCouncil;
  });

  const utility: NavItem[] = [
    { id: 'profile', href: '/profile', labelKey: 'profile', icon: User },
  ].filter(() => context.isAuthenticated);

  return { main, groups, admin, utility };
}

/** Route segment to section i18n key mapping for breadcrumbs */
export const routeSectionMap: Record<string, string> = {
  analytics: 'sectionOverview',
  treasury: 'sectionOverview',
  tasks: 'sectionWork',
  templates: 'sectionWork',
  sprints: 'sectionWork',
  proposals: 'sectionGovernance',
  ideas: 'sectionGovernance',
  disputes: 'sectionGovernance',
  posts: 'sectionSocial',
  community: 'sectionSocial',
  quests: 'sectionSocial',
  rewards: 'sectionSocial',
  notifications: 'sectionSocial',
  admin: 'sectionAdmin',
  profile: 'sectionAdmin',
};

/** Route segment to i18n label key mapping for breadcrumbs */
export const routeLabelMap: Record<string, string> = {
  analytics: 'analytics',
  treasury: 'treasury',
  tasks: 'tasks',
  templates: 'templates',
  sprints: 'sprints',
  proposals: 'proposals',
  ideas: 'ideas',
  disputes: 'disputes',
  posts: 'posts',
  community: 'community',
  quests: 'refAndQuests',
  rewards: 'rewards',
  notifications: 'notifications',
  admin: 'sectionAdmin',
  profile: 'profile',
  submissions: 'submissions',
  settings: 'settings',
};
