'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { EGG_ELEMENTS } from '@/features/easter/elements';

const ELEMENT_TO_IMAGE = new Map(EGG_ELEMENTS.map((e) => [e.element, e]));

interface LeaderboardEntry {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  organic_id: number | null;
  egg_count: number;
  elements: string[];
  earliest_find: string;
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch('/api/easter/leaderboard');
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

function useEggLeaderboard() {
  return useQuery({
    queryKey: ['easter', 'leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 60_000,
  });
}

const MEDALS = ['🥇', '🥈', '🥉'] as const;

export function EggLeaderboard() {
  const { data: entries, isLoading } = useEggLeaderboard();

  if (isLoading || !entries || entries.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        <Trophy className="w-3.5 h-3.5" />
        Hunters
      </h3>

      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div
            key={entry.user_id}
            className="flex items-center gap-2 rounded-lg border border-border/50 px-2.5 py-2"
          >
            {/* Rank */}
            <span className="w-5 text-center text-xs font-semibold shrink-0">
              {idx < 3 ? MEDALS[idx] : `${idx + 1}`}
            </span>

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {entry.avatar_url ? (
                <Image
                  src={entry.avatar_url}
                  alt={entry.name || 'User'}
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {(entry.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + organic_id */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {entry.name || 'Anonymous'}
              </p>
              {entry.organic_id && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  #{entry.organic_id}
                </p>
              )}
            </div>

            {/* Egg count */}
            <span className="text-xs font-bold text-foreground shrink-0">
              {entry.egg_count}/10
            </span>

            {/* Mini egg images */}
            <div className="flex items-center gap-0.5 shrink-0">
              {entry.elements.map((el) => {
                const egg = ELEMENT_TO_IMAGE.get(el);
                if (!egg) return null;
                return (
                  <Image
                    key={el}
                    src={egg.image}
                    alt={egg.element}
                    width={16}
                    height={16}
                    className="rounded-sm"
                    title={egg.element}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
