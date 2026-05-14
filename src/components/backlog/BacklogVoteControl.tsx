'use client';

import { useState, type MouseEvent } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useBacklogVote } from '@/features/backlog/hooks';

interface BacklogVoteControlProps {
  taskId: string;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  canVote: boolean;
}

type Optimistic = { up: number; down: number; my: -1 | 0 | 1 };

export function BacklogVoteControl({
  taskId,
  upvotes,
  downvotes,
  myVote,
  canVote,
}: BacklogVoteControlProps) {
  const [optimistic, setOptimistic] = useState<Optimistic>({
    up: upvotes,
    down: downvotes,
    my: myVote,
  });
  const mutation = useBacklogVote(taskId);

  const score = optimistic.up - optimistic.down;

  function applyOptimistic(next: 'up' | 'down' | 'none') {
    const prev = optimistic;
    let { up, down, my } = prev;
    if (my === 1) up -= 1;
    if (my === -1) down -= 1;
    if (next === 'up') {
      up += 1;
      my = 1;
    } else if (next === 'down') {
      down += 1;
      my = -1;
    } else {
      my = 0;
    }
    setOptimistic({ up, down, my });
    mutation.mutate(next, {
      onError: () => setOptimistic(prev),
      onSuccess: (data) =>
        setOptimistic({ up: data.upvotes, down: data.downvotes, my: data.my_vote }),
    });
  }

  function suppress(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onUp(event: MouseEvent<HTMLButtonElement>) {
    suppress(event);
    if (!canVote) return;
    applyOptimistic(optimistic.my === 1 ? 'none' : 'up');
  }

  function onDown(event: MouseEvent<HTMLButtonElement>) {
    suppress(event);
    if (!canVote) return;
    applyOptimistic(optimistic.my === -1 ? 'none' : 'down');
  }

  return (
    <div
      className="flex items-center gap-1 text-xs"
      data-testid={`backlog-vote-${taskId}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Upvote task"
        aria-pressed={optimistic.my === 1}
        disabled={!canVote || mutation.isPending}
        onClick={onUp}
        className={`rounded p-0.5 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50 ${
          optimistic.my === 1 ? 'text-emerald-600' : 'text-muted-foreground'
        }`}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <span
        className={`font-mono tabular-nums ${
          score > 0 ? 'text-emerald-600' : score < 0 ? 'text-rose-600' : 'text-muted-foreground'
        }`}
        aria-label={`Score ${score}`}
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote task"
        aria-pressed={optimistic.my === -1}
        disabled={!canVote || mutation.isPending}
        onClick={onDown}
        className={`rounded p-0.5 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50 ${
          optimistic.my === -1 ? 'text-rose-600' : 'text-muted-foreground'
        }`}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
