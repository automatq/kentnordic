import { useEffect, useRef, useState } from 'react';
import AuroraVeil from '@/components/three/AuroraVeil';
import { getRegions } from '@/lib/packages';
import { prefersReducedMotion } from '@/lib/useReducedMotion';
import { site } from '@/config/site';
import { cn } from '@/lib/classNames';

type IntroState = 'playing' | 'leaving' | 'done';
interface RegionPath {
  slug: string;
  d: string;
  color: string;
}

const SEEN_KEY = 'idc-intro-seen';
const AUTO_DISMISS_MS = 4600;

/**
 * First-visit intro: the client's Iceland map sketches itself region by
 * region in the artwork colours over deep ink, beneath the wordmark and an
 * aurora veil, then the whole curtain lifts to reveal the page.
 *
 * Plays once per session (agencies revisit constantly), never under
 * reduced motion, and is skippable at any moment (click / Escape / button).
 * `?intro` forces a replay for QA and demos. The map geometry is imported
 * on demand, so visits that skip the intro never download it.
 */
export default function SiteIntro() {
  const [state, setState] = useState<IntroState>('done');
  const [paths, setPaths] = useState<RegionPath[] | null>(null);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const forced = new URLSearchParams(window.location.search).has('intro');
    if (forced) {
      setState('playing');
      return;
    }
    if (sessionStorage.getItem(SEEN_KEY)) return;
    if (prefersReducedMotion()) return;
    setState('playing');
  }, []);

  useEffect(() => {
    if (state !== 'playing') return;
    sessionStorage.setItem(SEEN_KEY, '1');

    let cancelled = false;
    import('@/data/map-regions.json').then((mod) => {
      if (cancelled) return;
      const colors = new Map(getRegions().map((r) => [r.id, r.data.color]));
      setPaths(
        mod.default.regions.map((g: { slug: string; d: string }) => ({
          slug: g.slug,
          d: g.d,
          color: colors.get(g.slug) ?? '#9fc6bf',
        })),
      );
    });

    document.documentElement.style.overflow = 'hidden';
    dismissTimer.current = window.setTimeout(() => setState('leaving'), AUTO_DISMISS_MS);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setState('leaving');
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [state]);

  if (state === 'done') return null;

  const dismiss = () => setState('leaving');

  return (
    <div
      className={cn('site-intro', state === 'leaving' && 'is-leaving')}
      onClick={dismiss}
      onTransitionEnd={(event) => {
        if (event.propertyName === 'transform' && state === 'leaving') setState('done');
      }}
    >
      <AuroraVeil variant="dark" className="site-intro-aurora" />
      <div className="site-intro-inner" aria-hidden="true">
        <p className="site-intro-brand">
          Idcibidci <span>DMC</span>
        </p>
        {paths && (
          /* Tight bbox of the region outlines (the artwork's own viewBox
             reserves bottom-right space for its legend, off-centering the
             island); +60 padding all round for stroke overshoot. */
          <svg className="site-intro-map" viewBox="110 273 2879 1768">
            {paths.map((p, i) => (
              <path
                key={p.slug}
                d={p.d}
                pathLength={1}
                style={{ '--rc': p.color, '--dd': `${i * 0.14}s` } as React.CSSProperties}
              />
            ))}
          </svg>
        )}
        <p className="site-intro-tagline">{site.tagline}</p>
      </div>
      <button
        type="button"
        className="site-intro-skip"
        onClick={(event) => {
          event.stopPropagation();
          dismiss();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
