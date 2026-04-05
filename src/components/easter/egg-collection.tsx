'use client';

import Image from 'next/image';
import { Lock } from 'lucide-react';
import { useMyEggs } from '@/features/easter/hooks';
import { EGG_ELEMENTS, getEggElement } from '@/features/easter/elements';
import type { GoldenEgg } from '@/features/easter/schemas';
import { EggLeaderboard } from './egg-leaderboard';

export function EggCollection() {
  const { data: myEggs, isLoading } = useMyEggs();

  if (isLoading) return null;

  const foundMap = new Map<number, GoldenEgg>();
  if (myEggs) {
    for (const egg of myEggs) {
      foundMap.set(egg.egg_number, egg);
    }
  }

  const foundCount = foundMap.size;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          🥚 Golden Eggs
        </h2>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{foundCount}</span>/10
        </span>
      </div>

      {/* Egg grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EGG_ELEMENTS.map((element) => {
          const found = foundMap.get(element.number);
          return (
            <div
              key={element.number}
              className={`flex flex-col items-center rounded-lg border p-2 transition-colors ${
                found
                  ? 'border-border bg-card'
                  : 'border-border/50 bg-muted/30'
              }`}
            >
              {found ? (
                <>
                  <Image
                    src={element.image}
                    alt={element.element}
                    width={48}
                    height={48}
                    className="rounded-md"
                  />
                  <span className="mt-1 text-[10px] font-medium capitalize text-foreground">
                    {element.emoji} {element.element}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(found.found_at).toLocaleDateString()}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                    <Lock className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <span className="mt-1 text-[10px] font-medium text-muted-foreground/50">
                    ???
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <EggLeaderboard />
    </div>
  );
}
