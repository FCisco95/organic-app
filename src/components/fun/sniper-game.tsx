'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Ghost {
  id: number;
  left: number;
  top: number;
  delay: number;
  popped: boolean;
}

export function SniperGame() {
  const [score, setScore] = useState(0);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const nextId = useRef(0);

  const spawnGhost = useCallback(() => {
    const ghost: Ghost = {
      id: nextId.current++,
      left: Math.random() * (window.innerWidth - 80),
      top: Math.random() * (window.innerHeight - 100) + 70,
      delay: Math.random() * -4,
      popped: false,
    };
    setGhosts((prev) => [...prev, ghost]);

    // Auto-remove after 8s
    const ghostId = ghost.id;
    setTimeout(() => {
      setGhosts((prev) => prev.filter((g) => g.id !== ghostId));
    }, 8000);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(spawnGhost, 500);
    const t2 = setTimeout(spawnGhost, 1200);
    const interval = setInterval(spawnGhost, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [spawnGhost]);

  const popGhost = (id: number, e: React.MouseEvent) => {
    setGhosts((prev) =>
      prev.map((g) => (g.id === id ? { ...g, popped: true } : g))
    );
    setScore((s) => s + 1);

    // Score popup
    const popup = document.createElement('div');
    popup.textContent = '+1 💥';
    popup.style.cssText = `
      position:fixed; pointer-events:none; z-index:1001;
      font-family:var(--font-mono); font-size:18px; font-weight:700;
      color:var(--yellow); left:${e.clientX}px; top:${e.clientY}px;
      animation: score-pop-up 0.8s ease forwards;
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);

    // Remove ghost after pop animation
    setTimeout(() => {
      setGhosts((prev) => prev.filter((g) => g.id !== id));
    }, 400);
  };

  return (
    <>
      {/* Score counter */}
      <div
        className="fixed top-16 right-4 z-[1000] bg-[var(--surface)] border border-[var(--orange)] rounded-xl px-4 py-2 font-mono text-sm text-[var(--orange)] flex items-center gap-2"
        style={{ boxShadow: '0 0 20px var(--orange-glow)', animation: 'charBob 3s ease-in-out infinite' }}
      >
        <span>🎯</span>
        <span>
          Snipers: <strong>{score}</strong>
        </span>
      </div>

      {/* Ghost targets */}
      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          onClick={(e) => !ghost.popped && popGhost(ghost.id, e)}
          className="fixed w-[70px] h-[70px] z-[999] select-none flex items-center justify-center text-5xl hover:scale-125 transition-transform"
          style={{
            left: ghost.left,
            top: ghost.top,
            cursor: ghost.popped ? 'default' : 'crosshair',
            animation: ghost.popped
              ? 'ghost-pop 0.4s forwards'
              : `ghost-float 4s ease-in-out infinite ${ghost.delay}s`,
            filter: ghost.popped
              ? undefined
              : 'drop-shadow(0 0 12px rgba(255,60,60,0.4))',
            pointerEvents: ghost.popped ? 'none' : 'auto',
          }}
        >
          💀
        </div>
      ))}
    </>
  );
}
