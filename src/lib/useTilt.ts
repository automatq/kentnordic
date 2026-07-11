import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/useReducedMotion';

/**
 * Pointer-tracking card tilt (≤ maxDeg of rotateX/Y with a hint of lift).
 * Fine pointers only; no-ops under reduced motion. Composes with the card's
 * existing CSS hover transition by writing transform inline only while
 * hovered.
 */
export function useTilt<T extends HTMLElement>(maxDeg = 3.5): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

    let raf = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        el.style.transform = `perspective(52rem) rotateX(${(-dy * maxDeg).toFixed(2)}deg) rotateY(${(dx * maxDeg).toFixed(2)}deg) translateY(-4px)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
      setTimeout(() => {
        el.style.transition = '';
      }, 420);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [maxDeg]);

  return ref;
}
