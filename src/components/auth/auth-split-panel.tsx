'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

interface AuthSplitPanelProps {
  /** Heading text for the left panel */
  title: string;
  /** Subtitle text below the heading */
  subtitle: string;
  /** Footer text at the bottom of the panel */
  footer: string;
  /** Alt text for the logo image */
  logoAlt: string;
}

/**
 * Branded left panel for auth pages (desktop only).
 * Features a centered logo, tagline, and a subtle mouse-follow glow effect.
 * Hidden on mobile (< md breakpoint).
 */
export function AuthSplitPanel({ title, subtitle, footer, logoAlt }: AuthSplitPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  return (
    <div
      ref={panelRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="hidden md:flex md:w-[45%] lg:w-[50%] bg-sidebar flex-col justify-between p-10 lg:p-14 relative overflow-hidden"
    >
      {/* Mouse-follow radial glow — respects prefers-reduced-motion */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 motion-reduce:hidden"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(360px circle at ${mousePos.x}px ${mousePos.y}px, rgba(217, 93, 57, 0.07), transparent 70%)`,
        }}
        aria-hidden="true"
      />
      {/* Static gradient fallback for reduced-motion */}
      <div
        className="pointer-events-none absolute inset-0 hidden motion-reduce:block"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(217, 93, 57, 0.05), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Decorative geometric shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-organic-terracotta/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-organic-terracotta/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 right-10 w-24 h-24 border border-organic-terracotta/10 rounded-lg rotate-45" />
      <div className="absolute top-1/3 right-16 w-20 h-20 border border-organic-terracotta/10 rounded-full" />
      <div className="absolute bottom-1/4 left-20 w-16 h-16 border border-organic-terracotta/10 rounded-lg rotate-12" />

      {/* Top spacer */}
      <div className="relative z-10" />

      {/* Center: Logo + tagline */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        <Link href="/" className="inline-block mb-10">
          <Image
            src="/organic-logo.png"
            alt={logoAlt}
            width={1000}
            height={335}
            className="w-full max-w-[280px] lg:max-w-[320px]"
            priority
          />
        </Link>

        <h2 className="text-3xl lg:text-4xl font-display font-semibold text-sidebar-foreground leading-tight">
          {title}
        </h2>
        <p className="mt-4 text-lg text-sidebar-muted-foreground leading-relaxed">
          {subtitle}
        </p>

        <div className="mt-8 flex items-center gap-3">
          <div className="h-1 w-12 bg-organic-terracotta rounded-full" />
          <div className="h-1 w-6 bg-organic-terracotta/40 rounded-full" />
          <div className="h-1 w-3 bg-organic-terracotta/20 rounded-full" />
        </div>
      </div>

      {/* Footer pinned at bottom */}
      <div className="relative z-10">
        <p className="text-sm text-sidebar-muted-foreground text-center">{footer}</p>
      </div>
    </div>
  );
}
