import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether an element is near the viewport, for waking/sleeping canvas
 * render loops. The default rootMargin wakes a scene slightly before it
 * scrolls into view so it never appears mid-boot.
 */
export function useInViewport<T extends HTMLElement>(
  rootMargin = '25%',
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}
