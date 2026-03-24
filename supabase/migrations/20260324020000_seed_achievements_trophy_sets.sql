-- ─── B2: Seed 60 Narrative Achievements in 7 Sets + 10 Secrets ──────────
-- PlayStation trophy-style achievements with rarity, chains, and sets.
-- Updates existing achievements to have rarity + set assignments.

-- ─── Step 1: Create Achievement Sets ─────────────────────────────────────

INSERT INTO achievement_sets (id, name, description, icon, total_count) VALUES
  ('set_cultivator', 'The Cultivator''s Path', 'Master the art of task completion', 'sprout', 6),
  ('set_council', 'The Council''s Voice', 'Shape governance through votes and proposals', 'scale', 7),
  ('set_mycelium', 'The Mycelium Network', 'Weave connections across the community', 'network', 8),
  ('set_arbiter', 'The Arbiter''s Scale', 'Bring justice and resolution to disputes', 'gavel', 5),
  ('set_flame', 'The Eternal Flame', 'Maintain an unbroken streak of activity', 'flame', 5),
  ('set_ascension', 'The Ascension', 'Climb the ranks of XP and levels', 'mountain', 5),
  ('set_sprint', 'The Sprint Runner', 'Excel in sprint-based work', 'zap', 3)
ON CONFLICT (id) DO NOTHING;

-- ─── Step 2: Create Platinum Achievements ────────────────────────────────

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden) VALUES
  -- Platinum trophies (auto-awarded when set is complete)
  ('plat_cultivator', 'Master of the Harvest', 'Complete all achievements in The Cultivator''s Path', 'crown', 'contribution', 'counter', 'tasks_completed', 999999, 200, 'platinum', 'set_cultivator', NULL, 0, false),
  ('plat_council', 'The Oracle', 'Complete all achievements in The Council''s Voice', 'eye', 'governance', 'counter', 'votes_cast', 999999, 200, 'platinum', 'set_council', NULL, 0, false),
  ('plat_mycelium', 'The Heartwood', 'Complete all achievements in The Mycelium Network', 'heart', 'community', 'counter', 'comments_created', 999999, 200, 'platinum', 'set_mycelium', NULL, 0, false),
  ('plat_arbiter', 'The Arbiter Supreme', 'Complete all achievements in The Arbiter''s Scale', 'shield', 'governance', 'counter', 'disputes_resolved', 999999, 200, 'platinum', 'set_arbiter', NULL, 0, false),
  ('plat_flame', 'Eternal Flame Bearer', 'Complete all achievements in The Eternal Flame', 'fire', 'milestone', 'threshold', 'current_streak', 999999, 200, 'platinum', 'set_flame', NULL, 0, false),
  ('plat_ascension', 'The Transcendent', 'Complete all achievements in The Ascension', 'star', 'milestone', 'threshold', 'xp_total', 999999, 200, 'platinum', 'set_ascension', NULL, 0, false),
  ('plat_sprint', 'The Speed Sage', 'Complete all achievements in The Sprint Runner', 'lightning', 'contribution', 'counter', 'tasks_completed', 999999, 200, 'platinum', 'set_sprint', NULL, 0, false)
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity,
  set_id = EXCLUDED.set_id;

-- Link platinum IDs back to sets
UPDATE achievement_sets SET platinum_id = 'plat_cultivator' WHERE id = 'set_cultivator';
UPDATE achievement_sets SET platinum_id = 'plat_council' WHERE id = 'set_council';
UPDATE achievement_sets SET platinum_id = 'plat_mycelium' WHERE id = 'set_mycelium';
UPDATE achievement_sets SET platinum_id = 'plat_arbiter' WHERE id = 'set_arbiter';
UPDATE achievement_sets SET platinum_id = 'plat_flame' WHERE id = 'set_flame';
UPDATE achievement_sets SET platinum_id = 'plat_ascension' WHERE id = 'set_ascension';
UPDATE achievement_sets SET platinum_id = 'plat_sprint' WHERE id = 'set_sprint';

-- ─── Step 3: Update Existing Achievements with Rarity + Set ─────────────

-- Set 1: The Cultivator's Path (tasks) — update existing + add new
UPDATE achievements SET rarity = 'bronze', set_id = 'set_cultivator', chain_id = 'chain_tasks', chain_order = 1
  WHERE id = 'first_task';
UPDATE achievements SET rarity = 'bronze', set_id = 'set_cultivator', chain_id = 'chain_tasks', chain_order = 2
  WHERE id = 'tasks_5';
UPDATE achievements SET rarity = 'silver', set_id = 'set_cultivator', chain_id = 'chain_tasks', chain_order = 3
  WHERE id = 'tasks_25';
UPDATE achievements SET rarity = 'gold', set_id = 'set_cultivator', chain_id = 'chain_tasks', chain_order = 4
  WHERE id = 'tasks_100';

-- Set prerequisite chains for existing
UPDATE achievements SET prerequisite_achievement_id = 'first_task' WHERE id = 'tasks_5';
UPDATE achievements SET prerequisite_achievement_id = 'tasks_5' WHERE id = 'tasks_25';
UPDATE achievements SET prerequisite_achievement_id = 'tasks_25' WHERE id = 'tasks_100';

-- New cultivator achievements
INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('tasks_50', 'Harvest Moon', 'Complete 50 tasks', 'moon', 'contribution', 'counter', 'tasks_completed', 50, 40, 'silver', 'set_cultivator', 'chain_tasks', 5, false, 'tasks_25'),
  ('tasks_250', 'Ancient Cultivator', 'Complete 250 tasks', 'tree', 'contribution', 'counter', 'tasks_completed', 250, 80, 'gold', 'set_cultivator', 'chain_tasks', 6, false, 'tasks_100')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- Set 2: The Council's Voice (governance)
UPDATE achievements SET rarity = 'bronze', set_id = 'set_council', chain_id = 'chain_votes', chain_order = 1
  WHERE id = 'first_vote';
UPDATE achievements SET rarity = 'bronze', set_id = 'set_council', chain_id = 'chain_votes', chain_order = 2
  WHERE id = 'voter_10';
UPDATE achievements SET rarity = 'silver', set_id = 'set_council', chain_id = 'chain_votes', chain_order = 3
  WHERE id = 'voter_50';
UPDATE achievements SET rarity = 'bronze', set_id = 'set_council', chain_id = 'chain_proposals', chain_order = 1
  WHERE id = 'first_proposal';
UPDATE achievements SET rarity = 'silver', set_id = 'set_council', chain_id = 'chain_proposals', chain_order = 2
  WHERE id = 'proposals_5';

UPDATE achievements SET prerequisite_achievement_id = 'first_vote' WHERE id = 'voter_10';
UPDATE achievements SET prerequisite_achievement_id = 'voter_10' WHERE id = 'voter_50';
UPDATE achievements SET prerequisite_achievement_id = 'first_proposal' WHERE id = 'proposals_5';

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('voter_100', 'Centennial Vote', 'Cast 100 votes', 'check-circle', 'governance', 'counter', 'votes_cast', 100, 60, 'gold', 'set_council', 'chain_votes', 4, false, 'voter_50'),
  ('proposals_10', 'Visionary Forester', 'Create 10 proposals', 'eye', 'governance', 'counter', 'proposals_created', 10, 60, 'gold', 'set_council', 'chain_proposals', 3, false, 'proposals_5')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- Set 3: The Mycelium Network (community)
UPDATE achievements SET rarity = 'bronze', set_id = 'set_mycelium', chain_id = 'chain_comments', chain_order = 1
  WHERE id = 'first_comment';
UPDATE achievements SET rarity = 'silver', set_id = 'set_mycelium', chain_id = 'chain_comments', chain_order = 2
  WHERE id = 'comments_50';

UPDATE achievements SET prerequisite_achievement_id = 'first_comment' WHERE id = 'comments_50';

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('comments_10', 'Conversation Weaver', 'Post 10 comments', 'message-circle', 'community', 'counter', 'comments_created', 10, 15, 'bronze', 'set_mycelium', 'chain_comments', 2, false, 'first_comment'),
  ('comments_100', 'The Storyteller', 'Post 100 comments', 'book-open', 'community', 'counter', 'comments_created', 100, 50, 'gold', 'set_mycelium', 'chain_comments', 4, false, 'comments_50'),
  ('ideas_1', 'Idea Bloom', 'Share your first idea', 'lightbulb', 'community', 'counter', 'proposals_created', 1, 10, 'bronze', 'set_mycelium', 'chain_ideas', 1, false, NULL),
  ('ideas_5', 'Thought Garden', 'Share 5 ideas', 'flower', 'community', 'counter', 'proposals_created', 5, 25, 'silver', 'set_mycelium', 'chain_ideas', 2, false, 'ideas_1'),
  ('ideas_10', 'Idea Forest', 'Share 10 ideas', 'trees', 'community', 'counter', 'proposals_created', 10, 40, 'gold', 'set_mycelium', 'chain_ideas', 3, false, 'ideas_5')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- Fix chain_order for comments_50 (now 3rd, after Conversation Weaver)
UPDATE achievements SET chain_order = 3, prerequisite_achievement_id = 'comments_10' WHERE id = 'comments_50';

-- Set 4: The Arbiter's Scale (disputes)
UPDATE achievements SET rarity = 'bronze', set_id = 'set_arbiter', chain_id = 'chain_disputes', chain_order = 1
  WHERE id = 'first_arbiter';
UPDATE achievements SET rarity = 'silver', set_id = 'set_arbiter', chain_id = 'chain_disputes', chain_order = 2
  WHERE id = 'justice_keeper';
UPDATE achievements SET rarity = 'bronze', set_id = 'set_arbiter', chain_id = 'chain_mediation', chain_order = 1
  WHERE id = 'peacemaker';
UPDATE achievements SET rarity = 'silver', set_id = 'set_arbiter'
  WHERE id = 'vindicated';

UPDATE achievements SET prerequisite_achievement_id = 'first_arbiter' WHERE id = 'justice_keeper';

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('disputes_10', 'Grand Arbiter', 'Resolve 10 disputes', 'scale', 'governance', 'counter', 'disputes_resolved', 10, 50, 'gold', 'set_arbiter', 'chain_disputes', 3, false, 'justice_keeper'),
  ('mediated_5', 'The Mediator', 'Mediate 5 disputes', 'handshake', 'community', 'counter', 'disputes_mediated', 5, 30, 'silver', 'set_arbiter', 'chain_mediation', 2, false, 'peacemaker')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- Set 5: The Eternal Flame (streaks)
UPDATE achievements SET rarity = 'bronze', set_id = 'set_flame', chain_id = 'chain_streaks', chain_order = 1
  WHERE id = 'streak_7';
UPDATE achievements SET rarity = 'silver', set_id = 'set_flame', chain_id = 'chain_streaks', chain_order = 2
  WHERE id = 'streak_30';

UPDATE achievements SET prerequisite_achievement_id = 'streak_7' WHERE id = 'streak_30';

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('streak_14', 'Fortnight Flame', 'Maintain a 14-day streak', 'flame', 'milestone', 'threshold', 'current_streak', 14, 20, 'bronze', 'set_flame', 'chain_streaks', 2, false, 'streak_7'),
  ('streak_60', 'Phoenix Rising', 'Maintain a 60-day streak', 'sunrise', 'milestone', 'threshold', 'current_streak', 60, 60, 'gold', 'set_flame', 'chain_streaks', 4, false, 'streak_30'),
  ('streak_100', 'Eternal Ember', 'Maintain a 100-day streak', 'sun', 'milestone', 'threshold', 'current_streak', 100, 100, 'gold', 'set_flame', 'chain_streaks', 5, false, 'streak_60')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- Fix streak_30 chain_order (now 3rd after Fortnight Flame)
UPDATE achievements SET chain_order = 3, prerequisite_achievement_id = 'streak_14' WHERE id = 'streak_30';

-- Set 6: The Ascension (XP/levels)
UPDATE achievements SET rarity = 'bronze', set_id = 'set_ascension', chain_id = 'chain_xp', chain_order = 1
  WHERE id = 'xp_1000';
UPDATE achievements SET rarity = 'gold', set_id = 'set_ascension', chain_id = 'chain_xp', chain_order = 2
  WHERE id = 'xp_10000';

UPDATE achievements SET prerequisite_achievement_id = 'xp_1000' WHERE id = 'xp_10000';

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('xp_5000', 'XP Surge', 'Earn 5,000 XP', 'zap', 'milestone', 'threshold', 'xp_total', 5000, 40, 'silver', 'set_ascension', 'chain_xp', 2, false, 'xp_1000'),
  ('xp_25000', 'XP Legend', 'Earn 25,000 XP', 'award', 'milestone', 'threshold', 'xp_total', 25000, 80, 'gold', 'set_ascension', 'chain_xp', 4, false, 'xp_10000'),
  ('level_5', 'Branch Climber', 'Reach Level 5 (Branch)', 'git-branch', 'milestone', 'threshold', 'level', 5, 25, 'silver', 'set_ascension', 'chain_levels', 1, false, NULL)
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- Fix xp_10000 chain_order (now 3rd, after xp_5000)
UPDATE achievements SET chain_order = 3, prerequisite_achievement_id = 'xp_5000' WHERE id = 'xp_10000';

-- Set 7: The Sprint Runner (sprints)
INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden, prerequisite_achievement_id) VALUES
  ('sprint_first', 'First Sprint', 'Complete your first sprint task', 'play', 'contribution', 'counter', 'tasks_completed', 1, 10, 'bronze', 'set_sprint', 'chain_sprint', 1, false, NULL),
  ('sprint_5', 'Sprint Veteran', 'Complete 5 sprint tasks', 'fast-forward', 'contribution', 'counter', 'tasks_completed', 5, 20, 'silver', 'set_sprint', 'chain_sprint', 2, false, 'sprint_first'),
  ('sprint_20', 'Sprint Legend', 'Complete 20 sprint tasks', 'rocket', 'contribution', 'counter', 'tasks_completed', 20, 50, 'gold', 'set_sprint', 'chain_sprint', 3, false, 'sprint_5')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, set_id = EXCLUDED.set_id, chain_id = EXCLUDED.chain_id,
  chain_order = EXCLUDED.chain_order, prerequisite_achievement_id = EXCLUDED.prerequisite_achievement_id;

-- ─── Step 4: 10 Secret Achievements ─────────────────────────────────────

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward, rarity, set_id, chain_id, chain_order, is_hidden) VALUES
  ('secret_night_owl', 'The Night Owl', 'Be active between midnight and 5 AM', 'moon', 'milestone', 'threshold', 'current_streak', 1, 15, 'secret', NULL, NULL, 0, true),
  ('secret_genesis_voter', 'Genesis Voter', 'Vote on the very first proposal', 'flag', 'governance', 'counter', 'votes_cast', 1, 25, 'secret', NULL, NULL, 0, true),
  ('secret_contrarian', 'The Contrarian', 'Be the only dissenting vote on a passed proposal', 'thumbs-down', 'governance', 'counter', 'votes_cast', 1, 20, 'secret', NULL, NULL, 0, true),
  ('secret_full_circle', 'Full Circle', 'Complete a task from your own proposal', 'refresh-cw', 'contribution', 'counter', 'tasks_completed', 1, 25, 'secret', NULL, NULL, 0, true),
  ('secret_speed_demon', 'Speed Demon', 'Complete a task within 1 hour of assignment', 'zap', 'contribution', 'counter', 'tasks_completed', 1, 15, 'secret', NULL, NULL, 0, true),
  ('secret_unanimous', 'The Unanimous', 'Have a proposal pass with 100% approval', 'check-circle', 'governance', 'counter', 'proposals_created', 1, 30, 'secret', NULL, NULL, 0, true),
  ('secret_wallet', 'Wallet Whisperer', 'Link your Solana wallet', 'wallet', 'milestone', 'threshold', 'current_streak', 1, 10, 'secret', NULL, NULL, 0, true),
  ('secret_bridge', 'The Bridge Builder', 'Participate in all domains (tasks, votes, proposals, comments, ideas)', 'layers', 'community', 'counter', 'tasks_completed', 1, 50, 'secret', NULL, NULL, 0, true),
  ('secret_completionist', 'The Completionist''s Itch', 'Unlock 90% of all non-secret achievements', 'check-square', 'milestone', 'threshold', 'xp_total', 1, 100, 'secret', NULL, NULL, 0, true),
  ('secret_early_bird', 'The Early Bird', 'Be active before 6 AM', 'sunrise', 'milestone', 'threshold', 'current_streak', 1, 15, 'secret', NULL, NULL, 0, true)
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity, is_hidden = EXCLUDED.is_hidden, name = EXCLUDED.name, description = EXCLUDED.description;
