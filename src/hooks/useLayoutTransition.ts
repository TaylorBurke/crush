import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * FLIP animation hook for smooth layout transitions.
 * Tracks child positions across renders, animates repositioning and new element entry.
 * Children must have a `data-key` attribute for identity tracking.
 */
export function useLayoutTransition(containerRef: RefObject<HTMLElement | null>) {
  const prevRects = useRef(new Map<string, DOMRect>());
  const initialRender = useRef(true);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const children = Array.from(el.children) as HTMLElement[];
    const newRects = new Map<string, DOMRect>();

    for (const child of children) {
      const key = child.dataset.key;
      if (!key) continue;
      const curr = child.getBoundingClientRect();
      newRects.set(key, curr);

      if (initialRender.current) continue;

      const prev = prevRects.current.get(key);
      if (!prev) {
        // New element — pop in from behind
        child.animate(
          [
            { opacity: 0, transform: 'scale(0.85)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 300, easing: 'ease-out' },
        );
        continue;
      }

      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      // FLIP: inverse transform then animate to identity
      child.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 300, easing: 'ease-out' },
      );
    }

    prevRects.current = newRects;
    initialRender.current = false;
  });
}
