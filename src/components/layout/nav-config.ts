import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Gift,
  Home,
  Scale,
  Settings,
  Sparkles,
  Trophy,
  User,
  Users,
  Vote,
  Wallet,
  Zap,
} from 'lucide-react';

export interface NavContext {
  isAuthenticated: boolean;
  hasOrganicId: boolean;
  isAdminOrCouncil: boolean;
  progressionHref: string;
}

export interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavSections {
  main: NavItem[];
  admin: NavItem[];
  utility: NavItem[];
}

export function getSidebarNavSections(context: NavContext): NavSections {
  const { isAuthenticated, hasOrganicId, isAdminOrCouncil, progressionHref } = context;

  const main: NavItem[] = [
    { id: 'home', href: '/', labelKey: 'home', icon: Home },
    { id: 'analytics', href: '/analytics', labelKey: 'analytics', icon: BarChart3 },
    { id: 'treasury', href: '/treasury', labelKey: 'treasury', icon: Wallet },
    { id: 'members', href: '/members', labelKey: 'members', icon: Users },
    { id: 'tasks', href: '/tasks', labelKey: 'tasks', icon: CheckSquare },
    { id: 'templates', href: '/tasks/templates', labelKey: 'templates', icon: FileText },
    { id: 'sprints', href: '/sprints', labelKey: 'sprints', icon: Zap },
    { id: 'proposals', href: '/proposals', labelKey: 'proposals', icon: Vote },
    { id: 'leaderboard', href: '/leaderboard', labelKey: 'leaderboard', icon: Trophy },
    { id: 'progression', href: progressionHref, labelKey: 'progression', icon: Sparkles },
    { id: 'rewards', href: '/rewards', labelKey: 'rewards', icon: Gift },
    { id: 'disputes', href: '/disputes', labelKey: 'disputes', icon: Scale },
    { id: 'notifications', href: '/notifications', labelKey: 'notifications', icon: Bell },
  ].filter((item) => {
    if (item.id === 'members') return isAuthenticated;
    if (item.id === 'tasks') return hasOrganicId;
    if (item.id === 'templates') return isAdminOrCouncil;
    if (item.id === 'sprints') return hasOrganicId;
    if (
      item.id === 'proposals' ||
      item.id === 'leaderboard' ||
      item.id === 'progression' ||
      item.id === 'rewards' ||
      item.id === 'disputes' ||
      item.id === 'notifications'
    ) {
      return isAuthenticated;
    }
    return true;
  });

  const admin: NavItem[] = [
    {
      id: 'submissions',
      href: '/admin/submissions',
      labelKey: 'submissions',
      icon: ClipboardCheck,
    },
    { id: 'adminRewards', href: '/admin/rewards', labelKey: 'adminRewards', icon: Gift },
    { id: 'settings', href: '/admin/settings', labelKey: 'settings', icon: Settings },
  ].filter(() => isAdminOrCouncil);

  const utility: NavItem[] = [
    { id: 'profile', href: '/profile', labelKey: 'profile', icon: User },
  ].filter(() => isAuthenticated);

  return { main, admin, utility };
}
