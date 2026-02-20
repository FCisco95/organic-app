import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareLeaderboardEntries,
  rankLeaderboardEntries,
  type LeaderboardEntry,
} from '@/features/reputation/types';

type RankingFixture = Pick<
  LeaderboardEntry,
  'id' | 'xp_total' | 'total_points' | 'tasks_completed'
>;

test('leaderboard comparator prioritizes XP, then points, then tasks', () => {
  const higherXp: RankingFixture = {
    id: 'a',
    xp_total: 2_000,
    total_points: 1,
    tasks_completed: 1,
  };

  const higherPoints: RankingFixture = {
    id: 'b',
    xp_total: 1_000,
    total_points: 99_999,
    tasks_completed: 999,
  };

  const result = compareLeaderboardEntries(higherXp, higherPoints);
  assert.equal(result < 0, true);
});

test('rankLeaderboardEntries yields deterministic XP-first ordering', () => {
  const ranked = rankLeaderboardEntries<RankingFixture>([
    { id: 'u-a', xp_total: 1_000, total_points: 120, tasks_completed: 5 },
    { id: 'u-b', xp_total: 1_000, total_points: 120, tasks_completed: 9 },
    { id: 'u-c', xp_total: 1_000, total_points: 130, tasks_completed: 1 },
    { id: 'u-d', xp_total: 900, total_points: 10_000, tasks_completed: 99 },
  ]);

  assert.deepEqual(
    ranked.map((entry) => entry.id),
    ['u-c', 'u-b', 'u-a', 'u-d']
  );

  assert.deepEqual(
    ranked.map((entry) => entry.rank),
    [1, 2, 3, 4]
  );
});
