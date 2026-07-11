import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
} from '@react-three/drei';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import { Color, type Group } from 'three';

/*
 * The hero glacier crystal: a floating cluster of ice shards over the birch
 * paper, refracting the aurora-tinted environment. Loaded lazily behind
 * When3D — this module (and the three vendor chunks) never reach devices
 * that render the SVG cubes fallback.
 */

interface HeroCrystalSceneProps {
  frameloop: 'always' | 'never';
  onReady: () => void;
}

function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/* Satellite shards echo the old five-cube cluster composition. */
const SHARDS: Array<{
  kind: 'octa' | 'tetra' | 'ico';
  position: [number, number, number];
  scale: number;
  rotation: [number, number, number];
}> = [
  { kind: 'octa', position: [-1.45, 0.5, -0.5], scale: 0.42, rotation: [0.4, 0.2, 0.1] },
  { kind: 'tetra', position: [1.35, 0.85, -0.7], scale: 0.38, rotation: [0.1, 0.5, 0.3] },
  { kind: 'octa', position: [1.2, -0.8, 0.15], scale: 0.5, rotation: [0.7, 0.1, 0.4] },
  { kind: 'tetra', position: [-1.15, -0.95, 0.05], scale: 0.42, rotation: [0.2, 0.8, 0.5] },
  { kind: 'ico', position: [0.25, 1.35, -0.95], scale: 0.3, rotation: [0.5, 0.3, 0.8] },
];

function ShardGeometry({ kind }: { kind: 'octa' | 'tetra' | 'ico' }) {
  if (kind === 'octa') return <octahedronGeometry args={[1, 0]} />;
  if (kind === 'tetra') return <tetrahedronGeometry args={[1, 0]} />;
  return <icosahedronGeometry args={[1, 0]} />;
}

function CrystalCluster() {
  const groupRef = useRef<Group>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const tints = useMemo(
    () => ({
      ice: readToken('--color-accent-50', '#eff6f4'),
      mint: readToken('--color-aurora-mint', '#a7dacf'),
      periwinkle: readToken('--color-aurora-periwinkle', '#aab5cd'),
      // The refraction buffer can't see the DOM behind the transparent
      // canvas — feed it the page paper colour so "through the ice" reads
      // as the hero background rather than black.
      paper: new Color(readToken('--color-cream', '#f5f3ef')),
    }),
    [],
  );

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (event: PointerEvent) => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, dt) => {
    const group = groupRef.current;
    if (!group) return;
    // Idle drift plus gentle parallax toward the cursor.
    const targetX = pointerRef.current.y * 0.13;
    const targetY = pointerRef.current.x * 0.2 + state.clock.elapsedTime * 0.05;
    easing.dampE(group.rotation, [targetX, targetY, 0], 0.5, dt);
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.55}>
        <mesh>
          <icosahedronGeometry args={[1.05, 0]} />
          <MeshTransmissionMaterial
            samples={4}
            resolution={384}
            thickness={1.2}
            roughness={0.12}
            ior={1.31}
            chromaticAberration={0.18}
            anisotropicBlur={0.2}
            color={tints.ice}
            background={tints.paper}
            flatShading
          />
        </mesh>
      </Float>
      {SHARDS.map((shard, i) => (
        <Float key={i} speed={1 + i * 0.18} rotationIntensity={0.35} floatIntensity={0.7}>
          <mesh position={shard.position} scale={shard.scale} rotation={shard.rotation}>
            <ShardGeometry kind={shard.kind} />
            {/* Native transmission keeps satellites far cheaper than MTM. */}
            <meshPhysicalMaterial
              transmission={1}
              thickness={0.5}
              roughness={0.16}
              ior={1.31}
              color={i % 2 === 0 ? tints.mint : tints.periwinkle}
              flatShading
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function HeroCrystalScene({ frameloop, onReady }: HeroCrystalSceneProps) {
  const tints = useMemo(
    () => ({
      mint: readToken('--color-aurora-mint', '#a7dacf'),
      periwinkle: readToken('--color-aurora-periwinkle', '#aab5cd'),
      lavender: readToken('--color-aurora-lavender', '#c7b9dd'),
    }),
    [],
  );

  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.75]}
      camera={{ fov: 35, position: [0, 0.15, 6] }}
      gl={{ alpha: true, antialias: true }}
      onCreated={onReady}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <CrystalCluster />
      <ContactShadows position={[0, -1.9, 0]} opacity={0.22} scale={7} blur={2.6} far={3} resolution={256} frames={1} />
      {/* Aurora-tinted studio built from Lightformers — no runtime HDR fetch. */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} color={tints.mint} position={[0, 3, 4]} scale={[6, 3, 1]} />
        <Lightformer intensity={1.5} color={tints.periwinkle} position={[-4, 1, -2]} rotation-y={Math.PI / 2} scale={[5, 2, 1]} />
        <Lightformer intensity={1.2} color={tints.lavender} position={[4, -1, 2]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer intensity={1.6} color="#ffffff" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
      </Environment>
    </Canvas>
  );
}
