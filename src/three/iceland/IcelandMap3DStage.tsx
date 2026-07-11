import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import IcelandScene, { type PointInfo, type RegionInfo } from '@/three/iceland/IcelandScene';

interface IcelandMap3DStageProps {
  regions: RegionInfo[];
  activeRegion: string | null;
  onSelect: (slug: string) => void;
  onHover?: (slug: string | null) => void;
  points?: PointInfo[];
  activePoint?: string | null;
  onSelectPoint?: (id: string) => void;
  onHoverPoint?: (id: string | null) => void;
  onReady: () => void;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  // Fire after the first committed frame so the crossfade never reveals an
  // empty canvas.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

/** Lazy entry point: the R3F canvas hosting the extruded Iceland relief. */
export default function IcelandMap3DStage({
  regions,
  activeRegion,
  onSelect,
  onHover,
  points,
  activePoint,
  onSelectPoint,
  onHoverPoint,
  onReady,
}: IcelandMap3DStageProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: 40, position: [0.02, 1.26, 1.4], rotation: [-0.733, 0, 0] }}
      gl={{ alpha: true, antialias: true }}
    >
      <ReadySignal onReady={onReady} />
      <IcelandScene
        regions={regions}
        activeRegion={activeRegion}
        onSelect={onSelect}
        onHover={onHover}
        points={points}
        activePoint={activePoint}
        onSelectPoint={onSelectPoint}
        onHoverPoint={onHoverPoint}
      />
    </Canvas>
  );
}
