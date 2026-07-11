import { Children, useEffect, useRef } from 'react';
import { onScrollFrame } from '@/lib/scrollMath';
import { cn } from '@/lib/classNames';

interface TimelineRailProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a list of `ItineraryDay` elements (unmodified) and activates each
 * day's existing rail circle + connecting line as the user scrolls past it,
 * via CSS descendant selectors - no changes to ItineraryDay itself.
 */
export default function TimelineRail({ children, className }: TimelineRailProps) {
  const items = Children.toArray(children);
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    return onScrollFrame(() => {
      const marker = window.innerHeight * 0.4;
      dayRefs.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.classList.toggle('is-passed', rect.bottom < marker);
        el.classList.toggle('is-active', rect.top <= marker && rect.bottom >= marker);
      });
    });
  }, []);

  return (
    <div className={cn('rail-track', className)}>
      {items.map((child, i) => (
        <div
          className="rail-day"
          key={i}
          ref={(el) => {
            dayRefs.current[i] = el;
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
