/*
 * Device capability gates for the 3D layer. Every check errs toward the 2D
 * fallback: the enhanced scenes are strictly optional, so a false negative
 * costs a nicety while a false positive costs jank on weak hardware.
 */

const probeCache = new Map<string, boolean>();

function probeWebGL(requireHardware: boolean): boolean {
  const key = requireHardware ? 'hw' : 'any';
  const cached = probeCache.get(key);
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return false;
  let ok = false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const attrs = { failIfMajorPerformanceCaveat: requireHardware } as WebGLContextAttributes;
    const gl =
      canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs);
    ok = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    ok = false;
  }
  probeCache.set(key, ok);
  return ok;
}

/** Any WebGL at all — software rasterizers qualify (fine for tiny shaders). */
export function supportsWebGL(): boolean {
  return probeWebGL(false);
}

/** Hardware-accelerated WebGL — three.js scenes stay off software renderers. */
export function gpuAccelerated(): boolean {
  return probeWebGL(true);
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
  // QA escape hatch: ?force3d skips the device gates (WebGL still required)
  // so software-rendered test browsers can exercise the heavy scenes.
  const forced =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('force3d');
  if (saveData() && !forced) return false;
  if (!supportsWebGL()) return false;
  if (forced) return true;
  if (tier === 'heavy' && (!gpuAccelerated() || !deviceTierOk())) return false;
  return true;
}
