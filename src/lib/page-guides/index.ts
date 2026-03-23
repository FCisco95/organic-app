export type { GuideStep, PageGuide } from './types';
import type { PageGuide } from './types';

import { guide as dashboardGuide } from './dashboard';
import { guide as tasksGuide } from './tasks';
import { guide as proposalsGuide } from './proposals';
import { guide as sprintsGuide } from './sprints';
import { guide as rewardsGuide } from './rewards';
import { guide as disputesGuide } from './disputes';
import { guide as questsGuide } from './quests';
import { guide as analyticsGuide } from './analytics';
import { guide as treasuryGuide } from './treasury';
import { guide as communityGuide } from './community';
import { guide as ideasGuide } from './ideas';

const routeGuideMap: Record<string, PageGuide> = {
  '/': dashboardGuide,
  '/tasks': tasksGuide,
  '/proposals': proposalsGuide,
  '/sprints': sprintsGuide,
  '/rewards': rewardsGuide,
  '/disputes': disputesGuide,
  '/quests': questsGuide,
  '/analytics': analyticsGuide,
  '/treasury': treasuryGuide,
  '/community': communityGuide,
  '/ideas': ideasGuide,
};

export function getGuideForRoute(route: string): PageGuide | null {
  return routeGuideMap[route] ?? null;
}
