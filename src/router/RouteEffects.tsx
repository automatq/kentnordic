import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** How long to keep polling for a hash target while the lazy page mounts. */
const HASH_SCROLL_DEADLINE_MS = 3000;

export default function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    let rafId: number | null = null;

    if (location.hash) {
      // Pages are React.lazy on the client — on a cross-route navigation the
      // hash target doesn't exist yet when this effect fires. Poll per frame
      // until the element mounts (or give up after the deadline).
      const id = location.hash.slice(1);
      const deadline = performance.now() + HASH_SCROLL_DEADLINE_MS;
      const seek = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
          return;
        }
        if (performance.now() < deadline) rafId = requestAnimationFrame(seek);
      };
      rafId = requestAnimationFrame(seek);
    } else {
      window.scrollTo({ top: 0 });
    }
    window.dispatchEvent(new Event("routechange"));

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [location.pathname, location.hash, location.key]);

  return null;
}
