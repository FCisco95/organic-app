-- Hotfix: grant anon SELECT on leaderboard_materialized.
-- The view no longer contains email/PII (removed in security_hardening),
-- so it's safe for public/cached access. Required because the leaderboard
-- endpoint uses unstable_cache which can't access cookies (createClient).

grant select on leaderboard_materialized to anon;

-- Also fix the check_achievements function ambiguity:
-- The RETURNS TABLE column "achievement_id" conflicts with table columns
-- in sub-queries. Alias the return column to avoid ambiguity.

drop function if exists check_achievements(uuid);

create or replace function check_achievements(p_user_id uuid)
returns table(
  out_achievement_id text,
  achievement_name text,
  xp_reward integer,
  rarity text
)
language plpgsql
security definer
as $$
declare
  v_achievement record;
  v_current_value integer;
  v_prerequisite_met boolean;
  v_set record;
  v_plat record;
  v_unlocked_count integer;
begin
  for v_achievement in
    select a.*
    from achievements a
    where not exists (
      select 1 from user_achievements ua
      where ua.user_id = p_user_id and ua.achievement_id = a.id
    )
    order by a.chain_order asc nulls last
  loop
    -- Check prerequisite
    if v_achievement.prerequisite_achievement_id is not null then
      select exists (
        select 1 from user_achievements ua
        where ua.user_id = p_user_id
          and ua.achievement_id = v_achievement.prerequisite_achievement_id
      ) into v_prerequisite_met;

      if not v_prerequisite_met then
        continue;
      end if;
    end if;

    -- Evaluate condition
    v_current_value := 0;
    case v_achievement.condition_field
      when 'tasks_completed' then
        select coalesce(up.tasks_completed, 0) into v_current_value
        from user_profiles up where up.id = p_user_id;
      when 'xp_total' then
        select coalesce(up.xp_total, 0) into v_current_value
        from user_profiles up where up.id = p_user_id;
      when 'current_streak' then
        select coalesce(up.current_streak, 0) into v_current_value
        from user_profiles up where up.id = p_user_id;
      when 'votes_cast' then
        select count(*) into v_current_value
        from votes v where v.voter_id = p_user_id;
      when 'proposals_created' then
        select count(*) into v_current_value
        from proposals p where p.created_by = p_user_id and p.status != 'draft';
      when 'comments_created' then
        select count(*) into v_current_value
        from comments c where c.user_id = p_user_id;
      when 'disputes_resolved' then
        select count(*) into v_current_value
        from disputes d where d.arbitrator_id = p_user_id and d.status = 'resolved';
      when 'level' then
        select coalesce(up.level, 1) into v_current_value
        from user_profiles up where up.id = p_user_id;
      when 'achievements_unlocked' then
        select count(*) into v_current_value
        from user_achievements ua2 where ua2.user_id = p_user_id;
      else
        continue;
    end case;

    -- Upsert progress
    insert into user_achievement_progress (user_id, achievement_id, current_value, updated_at)
    values (p_user_id, v_achievement.id, v_current_value, now())
    on conflict (user_id, achievement_id) do update
      set current_value = excluded.current_value, updated_at = now();

    -- Check threshold
    if v_current_value >= v_achievement.condition_threshold then
      -- Unlock achievement
      insert into user_achievements (user_id, achievement_id, unlocked_at)
      values (p_user_id, v_achievement.id, now())
      on conflict do nothing;

      -- Award XP
      if v_achievement.xp_reward > 0 then
        update user_profiles
        set xp_total = coalesce(xp_total, 0) + v_achievement.xp_reward
        where id = p_user_id;

        insert into xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
        values (
          p_user_id, 'achievement_unlocked', 'achievement', v_achievement.id,
          v_achievement.xp_reward,
          jsonb_build_object('achievement_name', v_achievement.name)
        );
      end if;

      -- Check for platinum set completion
      if v_achievement.set_id is not null then
        select * into v_set
        from achievement_sets
        where id = v_achievement.set_id;

        if v_set.id is not null and v_set.platinum_id is not null then
          select count(*) into v_unlocked_count
          from user_achievements ua3
          join achievements a2 on a2.id = ua3.achievement_id
          where ua3.user_id = p_user_id
            and a2.set_id = v_achievement.set_id
            and a2.id != v_set.platinum_id;

          if v_unlocked_count >= v_set.total_count then
            insert into user_achievements (user_id, achievement_id, unlocked_at)
            values (p_user_id, v_set.platinum_id, now())
            on conflict do nothing;

            select * into v_plat from achievements where id = v_set.platinum_id;
            if v_plat.id is not null and v_plat.xp_reward > 0 then
              update user_profiles
              set xp_total = coalesce(xp_total, 0) + v_plat.xp_reward
              where id = p_user_id;

              insert into xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
              values (
                p_user_id, 'achievement_unlocked', 'achievement', v_set.platinum_id,
                v_plat.xp_reward,
                jsonb_build_object('achievement_name', v_plat.name)
              );
            end if;

            out_achievement_id := v_set.platinum_id;
            achievement_name := v_plat.name;
            xp_reward := v_plat.xp_reward;
            rarity := 'platinum';
            return next;
          end if;
        end if;
      end if;

      out_achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      xp_reward := v_achievement.xp_reward;
      rarity := coalesce(v_achievement.rarity, 'bronze');
      return next;
    end if;
  end loop;
end;
$$;
