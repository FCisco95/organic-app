'use client';

import { useEffect, useRef } from 'react';

export function RocketCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX - 16}px`;
      el.style.top = `${e.clientY - 16}px`;
    };

    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed text-2xl z-[998] pointer-events-none"
    >
      🎯
    </div>
  );
}
