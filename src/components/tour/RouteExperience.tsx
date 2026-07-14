import { useState } from 'react';
import TourWalkthrough from '@/components/map/TourWalkthrough';
import TourFlythrough3D from '@/components/three/TourFlythrough3D';
import { canRender3D } from '@/lib/capabilities';
import { cn } from '@/lib/classNames';
import type { Tour } from '@/lib/content';

interface RouteExperienceProps {
  tour: Tour;
}

/**
 * The tour-detail map block: the classic day-by-day walkthrough by default,
 * with an opt-in cinematic 3D flyover. Because entering the flyover is an
 * explicit click (and its error boundary degrades to the 2D fallback if the
 * scene fails to boot), the only hard requirement is WebGL itself — no
 * hardware-GPU or device-tier gate, which false-negatives on real machines
 * (e.g. Safari's failIfMajorPerformanceCaveat quirks on Apple Silicon).
 * Reduced motion doesn't gate the tab either; the flyover just won't
 * auto-play (see TourFlythrough3D).
 */
export default function RouteExperience({ tour }: RouteExperienceProps) {
  const [mode, setMode] = useState<'map' | 'fly'>('map');
  const offer3D = canRender3D('light');
  const activeMode = offer3D ? mode : 'map';
  const gateNote = offer3D
    ? null
    : 'The 3D flyover needs a browser with WebGL enabled.';

  return (
    <div className="rx">
      <div className="rx-toggle" role="tablist" aria-label="Route view">
        <button type="button" role="tab" aria-selected={activeMode === 'map'} className={cn('rx-tab', activeMode === 'map' && 'is-active')} onClick={() => setMode('map')}>
          Day-by-day map
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'fly'}
          className={cn('rx-tab', activeMode === 'fly' && 'is-active')}
          disabled={!offer3D}
          title={gateNote ?? undefined}
          onClick={() => setMode('fly')}
        >
          Cinematic flyover
          <span className="rx-tab-badge">3D</span>
        </button>
      </div>
      {gateNote && <p className="rx-note">{gateNote}</p>}
      {activeMode === 'fly' ? <TourFlythrough3D tour={tour} /> : <TourWalkthrough tours={[tour]} />}
    </div>
  );
}
