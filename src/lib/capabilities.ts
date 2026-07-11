/*
 * Device capability gates for the 3D layer. Every check errs toward the 2D
 * fallback: the enhanced scenes are strictly optional, so a false negative
 * costs a nicety while a false positive costs jank on weak hardware.
 */

let webglSupport: boolean | null = null;

/** Probe WebGL once (2 then 1), rejecting software rasterizers. */
export function supportsWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  if (typeof document === 'undefined') return (webglSupport = false);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const attrs = { failIfMajorPerformanceCaveat: true } as WebGLContextAttributes;
    const gl =
      canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs);
    webglSupport = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** Data-saver users never pay for a 3D chunk download. */
export function saveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/** Heavy scenes need a desktop-class viewport and at least mid-tier hardware. */
export function deviceTierOk(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth < 768) return false;
  const cores = navigator.hardwareConcurrency;
  if (cores !== undefined && cores < 4) return false;
  const memory = (navigator as { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined && memory < 4) return false;
  return true;
}

export type SceneTier = 'light' | 'heavy';

/**
 * Composed gate. `light` (aurora shader) runs anywhere WebGL works, including
 * phones; `heavy` (three.js scenes) additionally requires a capable device.
 * Reduced motion is handled separately (and live) by When3D/useReducedMotion.
 */
export function canRender3D(tier: SceneTier): boolean {
  if (saveData()) return false;
  if (!supportsWebGL()) return false;
  if (tier === 'heavy' && !deviceTierOk()) return false;
  return true;
}
