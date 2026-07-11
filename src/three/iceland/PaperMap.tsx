import { invalidate } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import baseSvg from '@/data/map-base.svg?raw';
import { getIcelandGeometry } from '@/three/iceland/regionGeometry';

const TEX_WIDTH = 2048;
const TEX_HEIGHT = Math.round((TEX_WIDTH * 2100) / 3000);

let texturePromise: Promise<CanvasTexture> | null = null;

/** Rasterize the original map artwork once and cache the texture. */
function loadPaperTexture(): Promise<CanvasTexture> {
  if (texturePromise) return texturePromise;
  texturePromise = new Promise((resolve, reject) => {
    const blob = new Blob([baseSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = TEX_WIDTH;
      canvas.height = TEX_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('2d context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, TEX_WIDTH, TEX_HEIGHT);
      // Erase the artwork's baked-in legend swatches (bottom-right corner) —
      // the DOM panel is the legend here, and a flat swatch table floating
      // on the 3D paper reads as a glitch. Coords in the 3000×2100 plane.
      const sx = TEX_WIDTH / 3000;
      const sy = TEX_HEIGHT / 2100;
      ctx.clearRect(2380 * sx, 1490 * sy, 620 * sx, 610 * sy);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      resolve(texture);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('map artwork rasterization failed'));
    };
    img.src = url;
  });
  return texturePromise;
}

/**
 * The client's original 2D map artwork, laid flat as the ground the extruded
 * regions rise from. Keeps the 3D relief unmistakably "the Iceland map"
 * rather than an abstract coloured ring.
 */
export default function PaperMap() {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  const { baseY } = getIcelandGeometry();

  useEffect(() => {
    let cancelled = false;
    loadPaperTexture()
      .then((tex) => {
        if (!cancelled) {
          setTexture(tex);
          invalidate();
        }
      })
      .catch(() => {
        /* the artwork is decorative context — regions alone still work */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!texture) return null;
  return (
    <mesh position={[0, baseY - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2, 2 * (2100 / 3000)]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
