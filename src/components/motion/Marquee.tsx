import { cn } from '@/lib/classNames';

interface MarqueeProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyFor: (item: T, index: number) => string | number;
  className?: string;
}

/** Infinite horizontal scroll strip (trust bullets, tour/region chips). Pauses on hover/focus. */
export default function Marquee<T>({ items, renderItem, keyFor, className }: MarqueeProps<T>) {
  return (
    <div className={cn('marquee', className)}>
      <div className="marquee-fade marquee-fade-start" aria-hidden="true" />
      <div className="marquee-fade marquee-fade-end" aria-hidden="true" />
      {[0, 1].map((group) => (
        <div className="marquee-track" key={group} aria-hidden={group === 1 ? true : undefined}>
          {items.map((item, i) => (
            <div className="marquee-item" key={keyFor(item, i)}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
