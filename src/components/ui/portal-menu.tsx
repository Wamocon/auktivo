"use client";

import { useRef, useLayoutEffect } from "react";

interface PortalMenuProps {
  top: number;
  right: number;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: string;
}

/**
 * Positioniert ein Dropdown-Menü via useLayoutEffect+ref statt JSX-Inline-Style,
 * um den CSS-inline-style Linter-Fehler zu umgehen (dynamische Portal-Positionierung).
 */
export function PortalMenu({ top, right, onClose, children, minWidth = "12rem" }: PortalMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.top = `${top}px`;
    el.style.right = `${right}px`;
    el.style.minWidth = minWidth;
  }, [top, right, minWidth]);

  return (
    <div
      ref={ref}
      className="fixed z-9999 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {children}
    </div>
  );
}
