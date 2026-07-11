import { useState } from 'react';
import TourWalkthrough from '@/components/map/TourWalkthrough';
import TourFlythrough3D from '@/components/three/TourFlythrough3D';
import { canRender3D } from '@/lib/capabilities';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/classNames';
import type { Tour } from '@/lib/content';

interface RouteExperienceProps {
  tour: Tour;
}

/**
 * The tour-detail map block: the classic day-by-day walkthrough by default,
 * with an opt-in cinematic 3D flyover on devices that qualify. The toggle
 * simply never renders elsewhere — reduced-motion, mobile, and no-WebGL
 * visitors see exactly the page they had before.
 */
export default function RouteExperience({ tour }: RouteExperienceProps) {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<'map' | 'fly'>('map');
  const offer3D = !reducedMotion && canRender3D('heavy');
  const activeMode = offer3D ? mode : 'map';

  return (
    <div className="rx">
      {offer3D && (
        <div className="rx-toggle" role="tablist" aria-label="Route view">
          <button type="button" role="tab" aria-selected={activeMode === 'map'} className={cn('rx-tab', activeMode === 'map' && 'is-active')} onClick={() => setMode('map')}>
            Day-by-day map
          </button>
          <button type="button" role="tab" aria-selected={activeMode === 'fly'} className={cn('rx-tab', activeMode === 'fly' && 'is-active')} onClick={() => setMode('fly')}>
            Cinematic flyover
            <span className="rx-tab-badge">3D</span>
          </button>
        </div>
      )}
      {activeMode === 'fly' ? <TourFlythrough3D tour={tour} /> : <TourWalkthrough tours={[tour]} />}
    </div>
  );
}
