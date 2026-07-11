import { ContactShadows } from '@react-three/drei';
import { useMemo } from 'react';
import PaperMap from '@/three/iceland/PaperMap';
import RegionMesh from '@/three/iceland/RegionMesh';
import { getIcelandGeometry } from '@/three/iceland/regionGeometry';

export interface RegionInfo {
  id: string;
  color: string;
}

interface IcelandSceneProps {
  regions: RegionInfo[];
  activeRegion?: string | null;
  interactive?: boolean;
  onSelect?: (slug: string) => void;
  onHover?: (slug: string | null) => void;
  children?: React.ReactNode;
}

/**
 * The extruded Iceland relief with its lighting rig — shared between the
 * Destinations map and the tour flythrough. Trails/pins/camera rigs come in
 * as children so both experiences stay in one visual world.
 */
export default function IcelandScene({ regions, activeRegion, interactive = true, onSelect, onHover, children }: IcelandSceneProps) {
  const geo = useMemo(() => getIcelandGeometry(), []);
  const colorBySlug = useMemo(() => new Map(regions.map((r) => [r.id, r.color])), [regions]);

  return (
    <>
      <hemisphereLight args={['#ffffff', '#d8d2c8', 0.95]} />
      <directionalLight position={[1.6, 2.6, 1.2]} intensity={1.15} />
      <directionalLight position={[-2, 1.5, -1]} intensity={0.25} color="#dce8f5" />
      <PaperMap />
      {geo.regions.map((region) => (
        <RegionMesh
          key={region.slug}
          slug={region.slug}
          geometry={region.geometry}
          color={colorBySlug.get(region.slug) ?? '#cccccc'}
          active={activeRegion === region.slug}
          interactive={interactive}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      {children}
      {/* Soft drop beneath the whole paper so the map hovers off the page. */}
      <ContactShadows position={[0, geo.baseY - 0.06, 0.05]} opacity={0.25} scale={3.4} blur={2.8} far={0.3} resolution={512} frames={1} />
    </>
  );
}
