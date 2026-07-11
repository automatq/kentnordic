import { lazy, useState, type ReactNode } from 'react';
import When3D from '@/components/three/When3D';
import { useInViewport } from '@/lib/useInViewport';
import { cn } from '@/lib/classNames';
import type { PointInfo, RegionInfo } from '@/three/iceland/IcelandScene';

const IcelandMap3DStage = lazy(() => import('@/three/iceland/IcelandMap3DStage'));

interface IcelandMap3DProps {
  regions: RegionInfo[];
  activeRegion: string | null;
  onSelect: (slug: string) => void;
  onHover?: (slug: string | null) => void;
  points?: PointInfo[];
  activePoint?: string | null;
  onSelectPoint?: (id: string) => void;
  onHoverPoint?: (id: string | null) => void;
  /** The SVG map stage — always rendered beneath, and the only experience
      for reduced-motion / mobile / no-WebGL / errors. */
  fallback: ReactNode;
}

/**
 * Progressive 3D upgrade of the Iceland map stage. The SVG stage stays
 * mounted (and interactive) until the 3D scene has painted, then fades out
 * and yields pointer duty to the canvas. Keyboard and screen-reader flows
 * keep using the legend buttons + region panel, which drive the same state.
 */
export default function IcelandMap3D({
  regions,
  activeRegion,
  onSelect,
  onHover,
  points,
  activePoint,
  onSelectPoint,
  onHoverPoint,
  fallback,
}: IcelandMap3DProps) {
  const [hostRef, inView] = useInViewport<HTMLDivElement>('25%');
  const [ready, setReady] = useState(false);

  return (
    <div ref={hostRef} className="map3d">
      <div className={cn('map3d-svg', ready && 'is-yield')}>{fallback}</div>
      <When3D tier="heavy" fallback={null}>
        {(inView || ready) && (
          <div className={cn('map3d-canvas', ready && 'is-ready')} aria-hidden="true">
            <IcelandMap3DStage
              regions={regions}
              activeRegion={activeRegion}
              onSelect={onSelect}
              onHover={onHover}
              points={points}
              activePoint={activePoint}
              onSelectPoint={onSelectPoint}
              onHoverPoint={onHoverPoint}
              onReady={() => setReady(true)}
            />
          </div>
        )}
      </When3D>
    </div>
  );
}
