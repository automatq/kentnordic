import { ContactShadows } from '@react-three/drei';
import { useMemo } from 'react';
import { Color } from 'three';
import PaperMap from '@/three/iceland/PaperMap';
import PointMesh, { type PointInfo } from '@/three/iceland/PointMesh';
import RegionMesh from '@/three/iceland/RegionMesh';
import { getIcelandGeometry } from '@/three/iceland/regionGeometry';

export type { PointInfo };

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
  /** Individual destination markers (main map only — omit elsewhere). */
  points?: PointInfo[];
  activePoint?: string | null;
  onSelectPoint?: (id: string) => void;
  onHoverPoint?: (id: string | null) => void;
  children?: React.ReactNode;
}

/**
 * The extruded Iceland relief with its lighting rig — shared between the
 * Destinations map and the tour flythrough. Trails/pins/camera rigs come in
 * as children so both experiences stay in one visual world.
 */
export default function IcelandScene({
  regions,
  activeRegion,
  interactive = true,
  onSelect,
  onHover,
  points,
  activePoint,
  onSelectPoint,
  onHoverPoint,
  children,
}: IcelandSceneProps) {
  const geo = useMemo(() => getIcelandGeometry(), []);
  const colorBySlug = useMemo(() => new Map(regions.map((r) => [r.id, r.color])), [regions]);
  const palette = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    const white = read('--color-white', '#ffffff');
    const gold = read('--color-brand-gold', '#fdc613');
    return {
      white,
      ground: read('--color-line', '#e5d8cd'),
      sunlight: new Color(gold).lerp(new Color(white), 0.82).getStyle(),
      taupe: read('--color-brand-taupe', '#6d5b51'),
    };
  }, []);

  return (
    <>
      <hemisphereLight args={[palette.white, palette.ground, 0.95]} />
      <directionalLight position={[1.6, 2.6, 1.2]} intensity={1.15} />
      <directionalLight position={[-2, 1.5, -1]} intensity={0.25} color={palette.sunlight} />
      <PaperMap />
      {geo.regions.map((region) => (
        <RegionMesh
          key={region.slug}
          slug={region.slug}
          geometry={region.geometry}
          color={colorBySlug.get(region.slug) ?? palette.taupe}
          active={activeRegion === region.slug}
          interactive={interactive}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      {points?.map((p) => (
        <PointMesh key={p.id} point={p} active={activePoint === p.id} onSelect={onSelectPoint} onHover={onHoverPoint} />
      ))}
      {children}
      {/* Soft drop beneath the whole paper so the map hovers off the page. */}
      <ContactShadows position={[0, geo.baseY - 0.06, 0.05]} opacity={0.25} scale={3.4} blur={2.8} far={0.3} resolution={512} frames={1} />
    </>
  );
}
