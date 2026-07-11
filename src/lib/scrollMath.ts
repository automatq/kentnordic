/**
 * Shared scroll-driven animation utilities. `onScrollFrame` multiplexes every
 * caller onto ONE requestAnimationFrame loop (rather than each motion
 * component running its own), so a page with several scroll-driven sections
 * doesn't spin up competing per-frame loops.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((clamp(value, inMin, inMax) - inMin) / (inMax - inMin)) * (outMax - outMin);
}

type FrameTick = () => void;

const tickers = new Set<FrameTick>();
let rafId: number | null = null;

function loop() {
  tickers.forEach((tick) => tick());
  rafId = tickers.size ? requestAnimationFrame(loop) : null;
}

/** Registers a per-frame callback while at least one caller is subscribed. Returns an unsubscribe function. */
export function onScrollFrame(tick: FrameTick): () => void {
  if (typeof window === 'undefined') return () => {};
  tickers.add(tick);
  if (rafId === null) rafId = requestAnimationFrame(loop);
  return () => {
    tickers.delete(tick);
  };
}
