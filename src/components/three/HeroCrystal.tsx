import { lazy, useState } from 'react';
import HeroCubesArt from '@/components/home/HeroCubesArt';
import When3D from '@/components/three/When3D';
import { useInViewport } from '@/lib/useInViewport';
import { cn } from '@/lib/classNames';

const HeroCrystalScene = lazy(() => import('@/three/HeroCrystalScene'));

/**
 * Hero art: the WebGL glacier crystal for capable desktops, the animated SVG
 * cubes for everyone else. The SVG renders beneath the canvas and crossfades
 * out only once the scene has actually produced a frame, so slow connections
 * watch the cubes draw in and never see a hole.
 */
export default function HeroCrystal() {
  const [hostRef, inView] = useInViewport<HTMLDivElement>('25%');
  const [ready, setReady] = useState(false);

  return (
    <div ref={hostRef} className="hero-crystal">
      <div className={cn('hero-crystal-svg', ready && 'is-yield')}>
        <HeroCubesArt />
      </div>
      <When3D tier="heavy" fallback={null}>
        {(inView || ready) && (
          <div className={cn('hero-crystal-canvas', ready && 'is-ready')} aria-hidden="true">
            <HeroCrystalScene frameloop={inView ? 'always' : 'never'} onReady={() => setReady(true)} />
          </div>
        )}
      </When3D>
    </div>
  );
}
