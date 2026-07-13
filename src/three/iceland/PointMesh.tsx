import { useFrame, invalidate } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { easing } from 'maath';
import { useMemo, useRef, useState } from 'react';
import { Color, type Mesh } from 'three';
import { toWorld } from '@/three/iceland/regionGeometry';

export interface PointInfo {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface PointMeshProps {
  point: PointInfo;
  active: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

const POINT_LIFT = 0.015;
const RADIUS = 0.013;

/**
 * A single destination marker on the main map: a small sphere, deepened
 * from its region's colour for contrast against pale fills (mirroring the
 * ink-mix trick the destination panel's eyebrow already uses), popping in
 * scale on hover/selection. Same damp+invalidate demand-frameloop pattern
 * as RegionMesh, but scale feedback rather than a position lift — a marker
 * this small doesn't read well floating up and down.
 */
export default function PointMesh({ point, active, onSelect, onHover }: PointMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const scaleState = useRef({ v: 1 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const color = useMemo(() => new Color(point.color).lerp(new Color('#2c2421'), 0.32), [point.color]);
  const position = useMemo(() => toWorld(point.x, point.y, POINT_LIFT), [point.x, point.y]);

  const raised = active || hovered;

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const moving = easing.damp(scaleState.current, 'v', raised ? 1.6 : 1, 0.12, dt);
    mesh.scale.setScalar(scaleState.current.v);
    if (moving) invalidate();
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(point.id);
        invalidate();
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(null);
        invalidate();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(point.id);
        invalidate();
      }}
    >
      <sphereGeometry args={[RADIUS, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );
}
