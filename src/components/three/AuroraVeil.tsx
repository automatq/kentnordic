import { useEffect, useRef } from 'react';
import { cn } from '@/lib/classNames';
import { useInViewport } from '@/lib/useInViewport';
import When3D from '@/components/three/When3D';
import type { AuroraInstance } from '@/components/three/aurora/auroraEngine';

interface AuroraVeilProps {
  /** light = faint multiply tint over pale sections; dark = glowing screen blend. */
  variant: 'light' | 'dark';
  /** Override the per-variant default strength (0..1). */
  intensity?: number;
  className?: string;
}

const VARIANT_DEFAULTS = { light: 0.28, dark: 0.85 } as const;
const TOKENS = [
  '--color-brand-gold',
  '--color-brand-orange',
  '--color-brand-coral',
  '--color-brand-magenta',
];

function readTokenColors(): [number, number, number][] {
  const styles = getComputedStyle(document.documentElement);
  return TOKENS.map((token) => {
    const hex = styles.getPropertyValue(token).trim().replace('#', '');
    if (hex.length !== 6) return [0.87, 0.47, 0.44] as [number, number, number];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as [
      number,
      number,
      number,
    ];
  });
}

function AuroraCanvas({ variant, intensity }: { variant: 'light' | 'dark'; intensity: number }) {
  const [hostRef, inView] = useInViewport<HTMLDivElement>('50%');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AuroraInstance | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!inView || !canvas) return;
    let cancelled = false;
    // Engine loads on demand so route chunks stay shader-free.
    import('@/components/three/aurora/auroraEngine').then(({ createAurora }) => {
      if (cancelled) return;
      engineRef.current = createAurora(canvas, {
        colors: readTokenColors(),
        intensity,
        mode: variant === 'light' ? 'multiply' : 'screen',
      });
      engineRef.current?.start();
    });
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [inView, variant, intensity]);

  return (
    <div ref={hostRef} className="aurora-veil-host">
      {inView && <canvas ref={canvasRef} className="aurora-canvas" />}
    </div>
  );
}

/**
 * Living northern-lights background. Decorative only (aria-hidden); the CSS
 * gradient washes beneath remain the reduced-motion / no-WebGL / save-data
 * experience. The canvas exists only while its section is near the viewport —
 * scrolling away disposes the WebGL context entirely.
 */
export default function AuroraVeil({ variant, intensity, className }: AuroraVeilProps) {
  return (
    <div className={cn('aurora-veil', `aurora-veil--${variant}`, className)} aria-hidden="true">
      <When3D tier="light" fallback={null}>
        <AuroraCanvas variant={variant} intensity={intensity ?? VARIANT_DEFAULTS[variant]} />
      </When3D>
    </div>
  );
}
