import { useFrame, invalidate } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { easing } from 'maath';
import { useMemo, useRef, useState } from 'react';
import { Color, type Mesh, type MeshStandardMaterial } from 'three';
import type { ExtrudeGeometry } from 'three';

interface RegionMeshProps {
  slug: string;
  geometry: ExtrudeGeometry;
  color: string;
  active: boolean;
  interactive: boolean;
  onSelect?: (slug: string) => void;
  onHover?: (slug: string | null) => void;
}

const LIFT = 0.035;

/**
 * One extruded region plateau. Hover/selection lifts it and brightens its
 * artwork colour; all animation runs through maath damping inside a
 * demand-mode frameloop, so an untouched map costs zero GPU.
 */
export default function RegionMesh({ slug, geometry, color, active, interactive, onSelect, onHover }: RegionMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(interactive && hovered);
  const { base, lit } = useMemo(() => {
    const base = new Color(color);
    return { base, lit: base.clone().lerp(new Color('#ffffff'), 0.22) };
  }, [color]);

  const raised = active || hovered;

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as MeshStandardMaterial;
    const movingY = easing.damp(mesh.position, 'y', raised ? LIFT : 0, 0.14, dt);
    const movingC = easing.dampC(material.color, raised ? lit : base, 0.16, dt);
    if (movingY || movingC) invalidate();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation();
              setHovered(true);
              onHover?.(slug);
              invalidate();
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              setHovered(false);
              onHover?.(null);
              invalidate();
            }
          : undefined
      }
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onSelect?.(slug);
              invalidate();
            }
          : undefined
      }
    >
      <meshStandardMaterial color={base} roughness={0.85} metalness={0} />
    </mesh>
  );
}
