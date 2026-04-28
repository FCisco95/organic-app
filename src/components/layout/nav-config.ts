import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CheckSquare,
  ClipboardCheck,
  Gift,
  Home,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Quote,
  Rocket,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  Trophy,
  User,
  Vote,
  Wallet,
  Zap,
} from 'lucide-react';
import { isMarketplaceEnabled } from '@/config/feature-flags';

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
 * Group IDs: navigate, govern, build, engage
 */
const mainItemDefs: (NavItem & { groupId: string; showWhen?: (ctx: NavContext) => boolean })[] = [
  // Navigate
  {
    groupId: 'navigate',
    id: 'dashboard',
    href: '/dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    shortcutHint: 'G D',
  },
  {
    groupId: 'navigate',
    id: 'home',
    href: '/',
    labelKey: 'home',
    icon: Home,
    shortcutHint: 'G H',
  },
  {
    groupId: 'navigate',
    id: 'pulse',
    href: '/pulse',
    labelKey: 'pulse',
    icon: BarChart3,
    shortcutHint: 'G A',
  },
  {
    groupId: 'navigate',
    id: 'vault',
    href: '/vault',
    labelKey: 'vault',
    icon: Wallet,
  },
  // Govern
  {
    groupId: 'govern',
    id: 'proposals',
    href: '/proposals',
    labelKey: 'proposals',
    icon: Vote,
    shortcutHint: 'G P',
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'govern',
    id: 'ideas',
    href: '/ideas',
    labelKey: 'ideas',
    icon: Lightbulb,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'govern',
    id: 'resolve',
    href: '/disputes',
    labelKey: 'resolve',
    icon: Scale,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  // Build
  {
    groupId: 'build',
    id: 'tasks',
    href: '/tasks',
    labelKey: 'tasks',
    icon: CheckSquare,
    shortcutHint: 'G T',
    showWhen: (ctx) => ctx.hasOrganicId,
  },
  {
    groupId: 'build',
    id: 'sprints',
    href: '/sprints',
    labelKey: 'sprints',
    icon: Zap,
    showWhen: (ctx) => ctx.hasOrganicId,
  },
  // Engage
  {
    groupId: 'engage',
    id: 'feed',
    href: '/posts',
    labelKey: 'feed',
    icon: MessageSquare,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'engage',
    id: 'ranks',
    href: '/community',
    labelKey: 'ranks',
    icon: Trophy,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'engage',
    id: 'earn',
    href: '/earn',
    labelKey: 'earn',
    icon: Sparkles,
    showWhen: (ctx) => ctx.isAuthenticated,
  },
  {
    groupId: 'engage',
    id: 'marketplace',
    href: '/marketplace',
    labelKey: 'marketplace',
    icon: Megaphone,
    showWhen: (ctx) => ctx.isAuthenticated && isMarketplaceEnabled(),
  },
];

const groupDefs: { id: string; labelKey: string }[] = [
  { id: 'navigate', labelKey: 'sectionNavigate' },
  { id: 'govern', labelKey: 'sectionGovern' },
  { id: 'build', labelKey: 'sectionBuild' },
  { id: 'engage', labelKey: 'sectionEngage' },
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
    { id: 'adminTestimonials', href: '/admin/testimonials', labelKey: 'adminTestimonials', icon: Quote },
    { id: 'userManagement', href: '/admin/users', labelKey: 'userManagement', icon: ShieldAlert },
    { id: 'settings', href: '/admin/settings', labelKey: 'settings', icon: Settings },
  ].filter((item) => {
    if (item.id === 'settings') return isAdmin;
    return isAdminOrCouncil;
  });

  const utility: NavItem[] = [
    { id: 'forProjects', href: '/for-projects', labelKey: 'forProjects', icon: Rocket },
    ...(context.isAuthenticated
      ? [{ id: 'profile', href: '/profile', labelKey: 'profile', icon: User } as NavItem]
      : []),
  ];

  return { main, groups, admin, utility };
}

/** Route segment to section i18n key mapping for breadcrumbs */
export const routeSectionMap: Record<string, string> = {
  dashboard: 'sectionNavigate',
  pulse: 'sectionNavigate',
  vault: 'sectionNavigate',
  analytics: 'sectionNavigate', // backward compat
  treasury: 'sectionNavigate', // backward compat
  tasks: 'sectionBuild',
  templates: 'sectionBuild',
  sprints: 'sectionBuild',
  proposals: 'sectionGovern',
  ideas: 'sectionGovern',
  disputes: 'sectionGovern',
  posts: 'sectionEngage',
  community: 'sectionEngage',
  earn: 'sectionEngage',
  marketplace: 'sectionEngage',
  quests: 'sectionEngage', // backward compat
  rewards: 'sectionEngage', // backward compat
  notifications: 'sectionEngage', // backward compat
  'for-projects': 'sectionNavigate',
  admin: 'sectionAdmin',
  profile: 'sectionAdmin',
};

/** Route segment to i18n label key mapping for breadcrumbs */
export const routeLabelMap: Record<string, string> = {
  dashboard: 'dashboard',
  pulse: 'pulse',
  vault: 'vault',
  analytics: 'pulse', // backward compat
  treasury: 'vault', // backward compat
  tasks: 'tasks',
  templates: 'templates',
  sprints: 'sprints',
  proposals: 'proposals',
  ideas: 'ideas',
  disputes: 'resolve',
  posts: 'feed',
  community: 'ranks',
  earn: 'earn',
  marketplace: 'marketplace',
  quests: 'earn', // backward compat
  rewards: 'earn', // backward compat
  notifications: 'notifications',
  'for-projects': 'forProjects',
  admin: 'sectionAdmin',
  profile: 'profile',
  submissions: 'submissions',
  users: 'userManagement',
  settings: 'settings',
};
