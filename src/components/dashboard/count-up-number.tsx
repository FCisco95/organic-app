'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
}

export function CountUpNumber({ value, durationMs = 800, className }: CountUpNumberProps) {
  const [display, setDisplay] = useState<number>(value);
  const previousRef = useRef<number>(value);

  useEffect(() => {
    const start = previousRef.current;
    const end = value;
    if (start === end) return;
    const startedAt = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        previousRef.current = end;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <span className={`font-mono tabular-nums ${className ?? ''}`}>
      {display.toLocaleString()}
    </span>
  );
}
