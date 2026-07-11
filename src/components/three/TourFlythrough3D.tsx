import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import When3D from '@/components/three/When3D';
import { useInViewport } from '@/lib/useInViewport';
import { cn } from '@/lib/classNames';
import { getRegions } from '@/lib/packages';
import { getTrail, getWalkthrough } from '@/lib/tourRoute';
import type { Tour } from '@/lib/content';

const FlythroughScene = lazy(() => import('@/three/iceland/FlythroughScene'));

const DWELL_MS = 1900;

interface TourFlythrough3DProps {
  tour: Tour;
}

function readAccent(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
  return v || '#4a7e77';
}

/**
 * The cinematic flyover experience: R3F scene + a real-DOM HUD mirroring the
 * 2D walkthrough's keyboard bindings (arrows step days, space plays/pauses).
 * Mounted only from RouteExperience once the user opts in on a capable device.
 */
export default function TourFlythrough3D({ tour }: TourFlythrough3DProps) {
  const [hostRef, inView] = useInViewport<HTMLDivElement>('25%');
  const [ready, setReady] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const walk = useMemo(() => getWalkthrough(tour), [tour]);
  const trail = useMemo(() => getTrail(walk), [walk]);
  const regions = useMemo(() => getRegions().map((r) => ({ id: r.id, color: r.data.color })), []);
  const pinRegion = useMemo(() => new Map(walk.pins.map((p) => [p.id, p.region])), [walk]);
  const regionColor = useMemo(() => new Map(regions.map((r) => [r.id, r.color])), [regions]);
  const accent = useMemo(() => readAccent(), []);

  const days = walk.days;
  const day = days[dayIdx];
  const lastIdx = days.length - 1;

  const clearDwell = () => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = null;
  };
  useEffect(() => clearDwell, []);

  const goTo = useCallback(
    (idx: number, keepPlaying = false) => {
      clearDwell();
      setDayIdx(Math.min(Math.max(idx, 0), lastIdx));
      if (!keepPlaying) setPlaying(false);
    },
    [lastIdx],
  );

  const onArrive = useCallback(() => {
    if (!playing) return;
    clearDwell();
    dwellTimer.current = setTimeout(() => {
      setDayIdx((idx) => {
        if (idx >= lastIdx) {
          setPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    }, DWELL_MS);
  }, [playing, lastIdx]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(dayIdx + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(dayIdx - 1);
    } else if (event.key === ' ') {
      event.preventDefault();
      clearDwell();
      setPlaying((p) => !p);
    }
  };

  const pinColor = useCallback(
    (pinId: string) => regionColor.get(pinRegion.get(pinId) ?? '') ?? accent,
    [regionColor, pinRegion, accent],
  );

  return (
    <div ref={hostRef} className="fly" onKeyDown={onKeyDown}>
      <div className="fly-stage">
        <When3D tier="heavy" fallback={<div className="fly-loading">3D flyover unavailable on this device.</div>}>
          {(inView || ready) && (
            <div className={cn('fly-canvas', ready && 'is-ready')} aria-hidden="true">
              <FlythroughScene
                regions={regions}
                trail={trail}
                dayIdx={dayIdx}
                playing={playing}
                accent={accent}
                frameloop={inView ? 'always' : 'never'}
                pinColor={pinColor}
                onArrive={onArrive}
                onReady={() => setReady(true)}
              />
            </div>
          )}
        </When3D>
        {!ready && <div className="fly-loading">Preparing 3D flyover…</div>}
      </div>

      <div className="fly-hud">
        <div className="fly-day" aria-live="polite">
          <p className="fly-eyebrow">
            Day {day?.day ?? 1} of {days.length} · {tour.data.code}
          </p>
          <h3 className="fly-title">{day?.title}</h3>
          {day?.summary && <p className="fly-summary">{day.summary}</p>}
        </div>
        <div className="fly-controls">
          <button type="button" className="fly-btn" aria-label="Previous day" disabled={dayIdx === 0} onClick={() => goTo(dayIdx - 1)}>
            <Icon name="arrow" size={16} className="rotate-180" />
          </button>
          <button
            type="button"
            className="fly-btn fly-btn-play"
            aria-label={playing ? 'Pause flyover' : 'Play flyover'}
            onClick={() => {
              clearDwell();
              if (!playing && dayIdx === lastIdx) {
                setDayIdx(0);
              }
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Icon name="pause" size={16} /> : <Icon name="play" size={16} />}
          </button>
          <button type="button" className="fly-btn" aria-label="Next day" disabled={dayIdx === lastIdx} onClick={() => goTo(dayIdx + 1)}>
            <Icon name="arrow" size={16} />
          </button>
          <div className="fly-dots" role="tablist" aria-label="Days">
            {days.map((d, i) => (
              <button
                key={d.day}
                type="button"
                role="tab"
                aria-selected={i === dayIdx}
                aria-label={`Day ${d.day}: ${d.title}`}
                className={cn('fly-dot', i === dayIdx && 'is-active', i < dayIdx && 'is-passed')}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
