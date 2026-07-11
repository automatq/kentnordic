import { useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import { onScrollFrame, clamp } from '@/lib/scrollMath';
import { cn } from '@/lib/classNames';

export interface CardDeckItem {
  icon: string;
  title: string;
  body: string;
  highlight?: boolean;
}

interface CardDeckRevealProps {
  items: CardDeckItem[];
  eyebrow?: React.ReactNode;
  heading?: React.ReactNode;
  className?: string;
}

/** Scroll-driven card deck: cards start stacked and fan out as the sticky section scrolls past. */
export default function CardDeckReveal({ items, eyebrow, heading, className }: CardDeckRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const center = (items.length - 1) / 2;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    return onScrollFrame(() => {
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.bottom < 0 || rect.top > windowHeight) return;
      const raw = -rect.top / (rect.height - windowHeight);
      const p = clamp(raw, 0, 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      const isDesktop = window.innerWidth >= 1024;

      if (headingRef.current) {
        const hp = clamp(raw * 3, 0, 1);
        headingRef.current.style.opacity = String(hp);
        headingRef.current.style.transform = `translateY(${20 * (1 - hp)}px)`;
      }

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const offset = i - center;
        if (offset === 0) {
          el.style.transform = isDesktop
            ? `translateY(${-15 * eased}px) scale(${1 + 0.05 * eased})`
            : `scale(${1 + 0.02 * eased})`;
          return;
        }
        const dir = Math.sign(offset);
        const mag = Math.abs(offset);
        el.style.transform = isDesktop
          ? `translateX(${dir * (15 + 105 * eased * mag)}%) rotate(${dir * (3 + 9 * eased * mag)}deg) translateY(${10 * eased}px)`
          : `translateY(${dir * (5 + 55 * eased * mag)}%) rotate(${dir * (2 + 4 * eased * mag)}deg) scale(${1 - 0.05 * eased})`;
      });
    });
  }, [items.length, center]);

  return (
    <div ref={sectionRef} className={cn('deck-section', className)}>
      <div className="deck-sticky">
        <div className="deck-bg-accent" aria-hidden="true" />
        {(eyebrow || heading) && (
          <div ref={headingRef} className="deck-heading">
            {eyebrow}
            {heading}
          </div>
        )}
        <div className="deck-cards">
          {items.map((item, i) => (
            <div
              key={item.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={cn('deck-card', item.highlight && 'is-highlight')}
              style={{ zIndex: item.highlight ? items.length + 1 : items.length - Math.abs(i - center) }}
            >
              <span className="deck-card-icon">
                <Icon name={item.icon} size={24} />
              </span>
              <h3 className="deck-card-title">{item.title}</h3>
              <p className="deck-card-body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
