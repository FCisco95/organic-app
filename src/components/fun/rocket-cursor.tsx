'use client';

import { useEffect, useRef } from 'react';

export function RocketCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX + 15}px`;
      el.style.top = `${e.clientY - 10}px`;
    };

    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed text-xl z-[998] pointer-events-none drop-shadow-[0_0_8px_var(--orange)]"
      style={{ transition: 'left 0.12s ease-out, top 0.12s ease-out' }}
    >
      🚀
    </div>
  );
}
