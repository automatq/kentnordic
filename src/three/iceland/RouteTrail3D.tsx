import { useFrame, invalidate } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3, type Mesh } from 'three';
import type { Trail } from '@/lib/tourRoute';
import { toWorld } from '@/three/iceland/regionGeometry';

/*
 * The tour route as a physical ribbon over the relief: one tube per day leg,
 * revealed by a global progress parameter u (0..1 of the whole trail), with
 * a sphere pin at every stop. Everything derives from tourRoute's Trail —
 * the same data the 2D walkthrough draws. Reveal state is mutated per frame
 * from uRef (no React re-renders on the hot path).
 */

export const TRAIL_LIFT = 0.014;
const TUBE_RADIUS = 0.0045;
const RADIAL_SEGMENTS = 6;

export interface TrailRuntime {
  curve: CatmullRomCurve3;
  /** Arc-length parameter (0..1) of each trail point along the curve. */
  pointU: number[];
  /** dayEnd[i] mapped to u — the camera/draw target for finishing day i. */
  dayEndU: number[];
}

export function buildTrailRuntime(trail: Trail): TrailRuntime | null {
  if (trail.points.length < 2) return null;
  const vecs = trail.points.map((p) => new Vector3(...toWorld(p.x, p.y, TRAIL_LIFT)));
  const curve = new CatmullRomCurve3(vecs, false, 'centripetal', 0.5);
  // Map point indices to arc-length u via cumulative chord length — close
  // enough to the curve's own arc-length mapping for pacing and reveals.
  const cum: number[] = [0];
  for (let i = 1; i < vecs.length; i++) cum.push(cum[i - 1] + vecs[i].distanceTo(vecs[i - 1]));
  const total = cum[cum.length - 1] || 1;
  const pointU = cum.map((c) => c / total);
  const dayEndU = trail.dayEnd.map((idx) => (idx >= 0 ? pointU[idx] : 0));
  return { curve, pointU, dayEndU };
}

interface RouteTrail3DProps {
  trail: Trail;
  runtime: TrailRuntime;
  /** Global reveal progress along the whole trail (0..1), advanced by the rig. */
  uRef: React.RefObject<number>;
  pinColor: (pinId: string) => string;
  accent: string;
  /** Clicking a revealed pin — the host jumps to that stop's day. */
  onSelectPin?: (pinId: string) => void;
}

export default function RouteTrail3D({ trail, runtime, uRef, pinColor, accent, onSelectPin }: RouteTrail3DProps) {
  const legMeshes = useRef<Array<Mesh | null>>([]);
  const pinMeshes = useRef<Array<Mesh | null>>([]);
  const [hoveredPin, setHoveredPin] = useState(false);
  useCursor(hoveredPin);

  const legs = useMemo(() => {
    const out: Array<{ geometry: TubeGeometry; uStart: number; uEnd: number; indexCount: number }> = [];
    for (let day = 0; day < trail.dayEnd.length; day++) {
      const start = day === 0 ? 0 : Math.max(trail.dayEnd[day - 1], 0);
      const end = trail.dayEnd[day];
      if (end <= start) continue;
      const pts = trail.points.slice(start, end + 1).map((p) => new Vector3(...toWorld(p.x, p.y, TRAIL_LIFT)));
      const legCurve = new CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      const tubularSegments = Math.max(pts.length * 14, 32);
      const geometry = new TubeGeometry(legCurve, tubularSegments, TUBE_RADIUS, RADIAL_SEGMENTS, false);
      out.push({
        geometry,
        uStart: runtime.pointU[start],
        uEnd: runtime.pointU[end],
        indexCount: tubularSegments * RADIAL_SEGMENTS * 6,
      });
    }
    return out;
  }, [trail, runtime]);

  useFrame(() => {
    const u = uRef.current ?? 0;
    legs.forEach((leg, i) => {
      const mesh = legMeshes.current[i];
      if (!mesh) return;
      const span = Math.max(leg.uEnd - leg.uStart, 1e-6);
      const t = Math.min(Math.max((u - leg.uStart) / span, 0), 1);
      mesh.visible = t > 0;
      leg.geometry.setDrawRange(0, Math.floor(leg.indexCount * t));
    });
    trail.points.forEach((_, i) => {
      const pin = pinMeshes.current[i];
      if (pin) pin.visible = runtime.pointU[i] <= u + 1e-4;
    });
  });

  return (
    <group>
      {legs.map((leg, i) => (
        <mesh
          key={i}
          geometry={leg.geometry}
          visible={false}
          ref={(el) => {
            legMeshes.current[i] = el;
          }}
        >
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      ))}
      {trail.points.map((p, i) => (
        <mesh
          key={`${p.pinId}-${i}`}
          position={toWorld(p.x, p.y, TRAIL_LIFT)}
          visible={false}
          ref={(el) => {
            pinMeshes.current[i] = el;
          }}
          onPointerOver={(e) => {
            if (!pinMeshes.current[i]?.visible) return;
            e.stopPropagation();
            setHoveredPin(true);
          }}
          onPointerOut={() => setHoveredPin(false)}
          onClick={(e) => {
            // Guard against selecting a stop the ribbon hasn't reached yet —
            // `visible` is mutated imperatively per-frame above, not via props.
            if (!pinMeshes.current[i]?.visible) return;
            e.stopPropagation();
            onSelectPin?.(p.pinId);
            invalidate();
          }}
        >
          <sphereGeometry args={[0.011, 12, 12]} />
          <meshStandardMaterial color={pinColor(p.pinId)} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
