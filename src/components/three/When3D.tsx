import { Component, Suspense, type ReactNode } from 'react';
import { canRender3D, type SceneTier } from '@/lib/capabilities';
import { useReducedMotion } from '@/lib/useReducedMotion';

interface When3DProps {
  tier: SceneTier;
  fallback: ReactNode;
  children: ReactNode;
  /**
   * The scene only mounts on an explicit user action (e.g. clicking a "3D"
   * tab), so reduced motion doesn't block it — user-initiated motion is
   * WCAG-compatible. The host is responsible for not auto-playing.
   */
  motionOptIn?: boolean;
}

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Catches lazy-chunk load failures and WebGL boot errors so a broken 3D
 * scene degrades permanently (for this mount) to its 2D fallback.
 */
class SceneErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The single gate every 3D surface mounts through. Renders the 2D fallback
 * unless the device qualifies (see capabilities.ts) and the user has not
 * asked for reduced motion — the latter is live, so flipping the OS setting
 * mid-session tears the scene down on the spot. Ambient scenes (aurora, hero
 * crystal, map) keep that strict default; explicitly user-invoked scenes pass
 * `motionOptIn` so only the device gate applies. Children are expected to be
 * React.lazy scenes; the Suspense fallback keeps the 2D content on screen
 * while a chunk streams in.
 */
export default function When3D({ tier, fallback, children, motionOptIn = false }: When3DProps) {
  const reducedMotion = useReducedMotion();
  if ((reducedMotion && !motionOptIn) || !canRender3D(tier)) return <>{fallback}</>;
  return (
    <SceneErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SceneErrorBoundary>
  );
}
