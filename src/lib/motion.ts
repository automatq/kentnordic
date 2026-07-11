/**
 * Scroll-reveal for elements with the `.u-reveal` class. Adds `.is-visible`
 * when the element enters the viewport. Respects prefers-reduced-motion (in
 * which case elements are shown immediately, matching the CSS fallback).
 *
 * Kept dependency-free and tiny; richer scroll-driven motion (parallax,
 * card decks, timelines) lives in src/components/motion and src/lib/scrollMath.
 * Import this once from BaseLayout.
 */
export function initReveal(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.u-reveal'));
  if (!els.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const delay = el.dataset.revealDelay;
        if (delay) el.style.transitionDelay = `${delay}ms`;
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  );

  els.forEach((el) => io.observe(el));
}

if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') initReveal();
  else document.addEventListener('DOMContentLoaded', initReveal);
  window.addEventListener('routechange', initReveal);
}
