export type BadgeType = 'permanent' | 'sprint';

export interface BadgeDefinition {
  name: string;
  icon: string;
  type: BadgeType;
  description: string;
  xp: number;
}

export const BADGES = {
  // --- Permanent badges (forever) ---
  easter_egg_hunter_2026: {
    name: 'Easter Egg Hunter 2026',
    icon: '🥚',
    type: 'permanent',
    description: 'Found a Golden Egg during the Easter 2026 campaign',
    xp: 100,
  },
  golden_collector: {
    name: 'Golden Collector',
    icon: '🏆',
    type: 'permanent',
    description: 'Found 5 or more Golden Eggs',
    xp: 250,
  },
  egg_legend: {
    name: 'Egg Legend',
    icon: '🌌',
    type: 'permanent',
    description: 'Found all 10 Golden Eggs',
    xp: 500,
  },
  genesis_member: {
    name: 'Genesis Member',
    icon: '🚀',
    type: 'permanent',
    description: 'Active during Sprint 1 (Genesis Sprint)',
    xp: 200,
  },
  first_voter: {
    name: 'First Voter',
    icon: '🗳️',
    type: 'permanent',
    description: 'Cast your first proposal vote',
    xp: 50,
  },
  first_task: {
    name: 'First Task',
    icon: '✅',
    type: 'permanent',
    description: 'Completed your first task',
    xp: 50,
  },
  idea_maker: {
    name: 'Idea Maker',
    icon: '💡',
    type: 'permanent',
    description: 'Submitted your first idea',
    xp: 50,
  },
  town_crier: {
    name: 'Town Crier',
    icon: '📣',
    type: 'permanent',
    description: 'Created your first post',
    xp: 50,
  },

  // --- Sprint badges (temporary, per-sprint) ---
  sprint_buyer: {
    name: 'Sprint Buyer',
    icon: '🛒',
    type: 'sprint',
    description: 'Increased ORG holdings during this sprint',
    xp: 75,
  },
  sprint_streak: {
    name: 'Sprint Streak',
    icon: '🔥',
    type: 'sprint',
    description: 'Logged in every day of the sprint',
    xp: 100,
  },
  sprint_champion: {
    name: 'Sprint Champion',
    icon: '🏅',
    type: 'sprint',
    description: 'Top 3 XP earner in the sprint',
    xp: 150,
  },
  sprint_contributor: {
    name: 'Sprint Contributor',
    icon: '📝',
    type: 'sprint',
    description: 'Completed 3 or more tasks in the sprint',
    xp: 75,
  },
  active_voter: {
    name: 'Active Voter',
    icon: '🗳️',
    type: 'sprint',
    description: 'Voted on 3 or more proposals in the sprint',
    xp: 75,
  },
} as const satisfies Record<string, BadgeDefinition>;

export type BadgeKey = keyof typeof BADGES;

export const BADGE_KEYS = Object.keys(BADGES) as BadgeKey[];
