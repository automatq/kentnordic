import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/useReducedMotion';

/**
 * Magnetic hover: the element leans up to `strength` px toward the cursor
 * while hovered and springs back on leave. Fine pointers only; no-ops under
 * reduced motion. Mutates style.transform directly (no re-renders), in the
 * same spirit as the scroll-driven motion components.
 */
export function useMagnetic<T extends HTMLElement>(strength = 6): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !strength) return;
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    };
    const onLeave = () => {
      el.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
      setTimeout(() => {
        el.style.transition = '';
      }, 380);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength]);

  return ref;
}
