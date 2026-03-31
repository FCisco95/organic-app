export type TaskCategory = 'daily' | 'weekly';

export interface DailyTaskDefinition {
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  pointsReward: number;
  category: TaskCategory;
}

export const DAILY_TASK_DEFINITIONS: readonly DailyTaskDefinition[] = [
  // --- Daily tasks ---
  {
    key: 'daily_login',
    title: 'Log in today',
    description: 'Open the app and start your day',
    target: 1,
    xpReward: 5,
    pointsReward: 0,
    category: 'daily',
  },
  {
    key: 'daily_like_3',
    title: 'Like 3 posts',
    description: 'Show appreciation by liking community posts',
    target: 3,
    xpReward: 10,
    pointsReward: 0,
    category: 'daily',
  },
  {
    key: 'daily_comment',
    title: 'Comment on a post',
    description: 'Join the conversation with a thoughtful comment',
    target: 1,
    xpReward: 15,
    pointsReward: 0,
    category: 'daily',
  },
  {
    key: 'daily_vote',
    title: 'Vote on a proposal',
    description: 'Have your say in governance',
    target: 1,
    xpReward: 20,
    pointsReward: 0,
    category: 'daily',
  },
  {
    key: 'daily_organic_post',
    title: 'Create a post about Organic',
    description: 'Share your thoughts about Organic with the community',
    target: 1,
    xpReward: 25,
    pointsReward: 3,
    category: 'daily',
  },
  {
    key: 'daily_share_x',
    title: 'Share Organic on X',
    description: 'Spread the word about Organic on X/Twitter',
    target: 1,
    xpReward: 30,
    pointsReward: 5,
    category: 'daily',
  },
  {
    key: 'daily_complete_task',
    title: 'Complete a sprint task',
    description: 'Finish an assigned sprint task',
    target: 1,
    xpReward: 25,
    pointsReward: 0,
    category: 'daily',
  },

  // --- Weekly tasks ---
  {
    key: 'weekly_streak_7',
    title: '7-day login streak',
    description: 'Log in for 7 consecutive days',
    target: 7,
    xpReward: 100,
    pointsReward: 10,
    category: 'weekly',
  },
  {
    key: 'weekly_all_dailies_5',
    title: 'Complete all dailies 5 days',
    description: 'Complete every daily task on 5 out of 7 days',
    target: 5,
    xpReward: 150,
    pointsReward: 15,
    category: 'weekly',
  },
] as const;

/** Quick lookup map by task key */
export const DAILY_TASK_MAP = new Map(
  DAILY_TASK_DEFINITIONS.map((t) => [t.key, t])
);
