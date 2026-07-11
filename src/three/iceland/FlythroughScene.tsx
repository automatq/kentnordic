import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import type { Trail } from '@/lib/tourRoute';
import IcelandScene, { type RegionInfo } from '@/three/iceland/IcelandScene';
import RouteTrail3D, { buildTrailRuntime, type TrailRuntime } from '@/three/iceland/RouteTrail3D';

/*
 * Cinematic flyover: the camera chases the tour's route spline across the
 * 3D relief, day by day. One global parameter u glides toward the end of
 * the selected day (constant cruise speed, damped camera), the trail ribbon
 * draws in sync, and at each stop the camera settles into a slow orbit.
 */

interface FlythroughSceneProps {
  regions: RegionInfo[];
  trail: Trail;
  /** Index into trail.dayEnd — the day whose end the camera flies toward. */
  dayIdx: number;
  playing: boolean;
  accent: string;
  frameloop: 'always' | 'never';
  pinColor: (pinId: string) => string;
  onArrive: () => void;
  onReady: () => void;
}

const CRUISE_SPEED = 0.052; // u per second while playing
const JUMP_SPEED = 0.14; // manual prev/next moves faster
const CHASE_BACK = 0.24;
const CHASE_UP = 0.165;
const LOOK_AHEAD = 0.035;
const ORBIT_RADIUS = 0.4;
const ORBIT_HEIGHT = 0.3;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

function Rig({
  runtime,
  targetU,
  playing,
  uRef,
  onArrive,
}: {
  runtime: TrailRuntime;
  targetU: number;
  playing: boolean;
  uRef: React.RefObject<number>;
  onArrive: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const look = useRef(new Vector3(0, 0, 0));
  const orbit = useRef(Math.PI * 0.75);
  const arrived = useRef(false);
  const scratch = useRef({ cam: new Vector3(), look: new Vector3() });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1); // tab-return spikes must not teleport
    const speed = playing ? CRUISE_SPEED : JUMP_SPEED;
    const diff = targetU - (uRef.current ?? 0);
    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    uRef.current = (uRef.current ?? 0) + step;

    const atTarget = Math.abs(targetU - uRef.current) < 1e-3;
    if (atTarget && !arrived.current) {
      arrived.current = true;
      onArrive();
    } else if (!atTarget) {
      arrived.current = false;
    }

    const u = clamp01(uRef.current);
    const p = runtime.curve.getPointAt(u);
    const { cam, look: lookT } = scratch.current;

    if (atTarget) {
      // Settled at a stop: drift around it slowly.
      orbit.current += dt * 0.14;
      cam.set(p.x + Math.cos(orbit.current) * ORBIT_RADIUS, p.y + ORBIT_HEIGHT, p.z + Math.sin(orbit.current) * ORBIT_RADIUS);
      lookT.copy(p);
    } else {
      // In flight: chase behind and above, look down-route.
      const tangent = runtime.curve.getTangentAt(u);
      cam.copy(p).addScaledVector(tangent, -CHASE_BACK);
      cam.y += CHASE_UP;
      lookT.copy(runtime.curve.getPointAt(clamp01(u + LOOK_AHEAD)));
    }

    easing.damp3(camera.position, cam, 0.55, dt);
    easing.damp3(look.current, lookT, 0.4, dt);
    camera.lookAt(look.current);
  });

  return null;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

export default function FlythroughScene({ regions, trail, dayIdx, playing, accent, frameloop, pinColor, onArrive, onReady }: FlythroughSceneProps) {
  const runtime = useMemo(() => buildTrailRuntime(trail), [trail]);
  const uRef = useRef(0);
  if (!runtime) return null;
  const targetU = runtime.dayEndU[Math.min(dayIdx, runtime.dayEndU.length - 1)] ?? 0;

  return (
    <Canvas frameloop={frameloop} dpr={[1, 1.75]} camera={{ fov: 40, position: [0.02, 1.26, 1.4], rotation: [-0.733, 0, 0] }} gl={{ alpha: true, antialias: true }}>
      <ReadySignal onReady={onReady} />
      <IcelandScene regions={regions} interactive={false}>
        <RouteTrail3D trail={trail} runtime={runtime} uRef={uRef} pinColor={pinColor} accent={accent} />
      </IcelandScene>
      <Rig runtime={runtime} targetU={targetU} playing={playing} uRef={uRef} onArrive={onArrive} />
    </Canvas>
  );
}
