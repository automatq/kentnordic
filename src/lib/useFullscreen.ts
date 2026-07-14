import { useCallback, useEffect, useState } from 'react';

/**
 * Fullscreen mode for a map/scene block. Requests native fullscreen when
 * available (immersive, hides browser chrome) and always drives an
 * `is-fullscreen` class so a fixed-overlay CSS fallback fills the viewport
 * where the API is blocked. State is the source of truth for the class;
 * `fullscreenchange` syncs a native Escape/exit, and our own Escape handler
 * covers the fallback path. Body scroll locks while open.
 */
export function useFullscreen(rootRef: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(() => {
    setIsFullscreen(true);
    rootRef.current?.requestFullscreen?.().catch(() => {});
  }, [rootRef]);

  const exit = useCallback(() => {
    setIsFullscreen(false);
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) exit();
    else enter();
  }, [isFullscreen, enter, exit]);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen, exit]);

  return { isFullscreen, enter, exit, toggle };
}
