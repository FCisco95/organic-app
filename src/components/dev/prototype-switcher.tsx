'use client';

import { useState } from 'react';

const prototypes = [
  { id: 'a', label: '1 · Stone', color: '#9ca3af' },
  { id: 'b', label: '2 · Ink', color: '#1e293b' },
  { id: 'c', label: '3 · Clay', color: '#D95D39' },
  { id: 'd', label: '4 · Slate', color: '#64748b' },
  { id: 'e', label: '5 · Charcoal', color: '#334155' },
] as const;

type PrototypeId = (typeof prototypes)[number]['id'];

const isDev = process.env.NODE_ENV === 'development';

export function PrototypeSwitcher() {
  const [active, setActive] = useState<PrototypeId | null>(null);
  const [open, setOpen] = useState(false);

  if (!isDev) return null;

  const apply = (id: PrototypeId | null) => {
    setActive(id);
    if (id) {
      document.documentElement.setAttribute('data-prototype', id);
    } else {
      document.documentElement.removeAttribute('data-prototype');
    }
  };

  return (
    <div className="fixed bottom-4 right-[4.5rem] z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-xl border border-border bg-card shadow-xl p-3 space-y-2 min-w-[180px]">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
            Prototype
          </p>
          <button
            onClick={() => apply(null)}
            className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
              active === null ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
            }`}
          >
            Default
          </button>
          {prototypes.map((p) => (
            <button
              key={p.id}
              onClick={() => apply(p.id)}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                active === p.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              {p.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center text-sm font-bold hover:scale-105 transition-transform"
        title="Toggle prototype switcher"
      >
        {active ? active.toUpperCase() : 'P'}
      </button>
    </div>
  );
}
