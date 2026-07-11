import { useEffect, useRef } from 'react';
import Pic from '@/components/ui/Pic';
import { onScrollFrame, clamp } from '@/lib/scrollMath';
import { cn } from '@/lib/classNames';
import AuroraVeil from '@/components/three/AuroraVeil';

export interface ParallaxGalleryItem {
  photoKey: string;
  alt: string;
  /** -1.5..1.5 - negative drifts up as the section scrolls by, positive drifts down. */
  speed: number;
  /** Static tilt in degrees. */
  rotation: number;
  style: React.CSSProperties;
  aspectClassName: string;
  visibilityClassName?: string;
}

interface ParallaxGalleryProps {
  items: ParallaxGalleryItem[];
  className?: string;
  children?: React.ReactNode;
  /** Layer a living aurora veil behind the floating photos (dark sections). */
  aurora?: boolean;
}

/** Tall sticky section with photo cards drifting at different speeds as the user scrolls past. */
export default function ParallaxGallery({ items, className, children, aurora }: ParallaxGalleryProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const progressRef = useRef(-1);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    return onScrollFrame(() => {
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.bottom < 0 || rect.top > windowHeight) return;
      const target = clamp(-rect.top / (rect.height - windowHeight), 0, 1);
      progressRef.current = progressRef.current === -1 ? target : progressRef.current + (target - progressRef.current) * 0.08;
      const progress = progressRef.current;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const { speed, rotation } = items[i];
        const yOffset = (0.5 - progress) * windowHeight * 2.2 * speed;
        el.style.transform = `translateY(${yOffset}px) rotate(${rotation}deg)`;
      });
    });
  }, [items]);

  return (
    <div ref={sectionRef} className={cn('pgallery', className)}>
      <div className="pgallery-sticky">
        {aurora && <AuroraVeil variant="dark" />}
        <div className="pgallery-glow" aria-hidden="true" />
        {children}
        {items.map((item, i) => (
          <div
            key={`${item.photoKey}-${i}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={cn('pgallery-item', item.visibilityClassName)}
            style={item.style}
          >
            <Pic photoKey={item.photoKey} alt={item.alt} className={cn('pgallery-img', item.aspectClassName)} sizes="(min-width: 1024px) 26rem, 60vw" />
          </div>
        ))}
      </div>
    </div>
  );
}
