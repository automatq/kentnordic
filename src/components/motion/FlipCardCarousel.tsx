import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
import Pic from '@/components/ui/Pic';
import { cn } from '@/lib/classNames';

export interface FlipCard {
  question: string;
  heading: string;
  answer: string;
  photoKey: string;
  icon: string;
}

interface FlipCardCarouselProps {
  cards: FlipCard[];
  className?: string;
}

/** 3D rotating wheel of flip-cards (FAQ). Click the active card to flip it; click a side card to bring it to front. */
export default function FlipCardCarousel({ cards, className }: FlipCardCarouselProps) {
  const [angle, setAngle] = useState(0);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [radius, setRadius] = useState(440);
  const touchStartX = useRef(0);
  const theta = 360 / cards.length;
  const normalized = ((angle % 360) + 360) % 360;
  const activeIndex = Math.round((360 - normalized) / theta) % cards.length;

  useEffect(() => {
    const updateRadius = () => {
      if (window.innerWidth < 640) {
        setRadius(270);
        return;
      }
      if (window.innerWidth < 1024) {
        setRadius(360);
        return;
      }
      setRadius(440);
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  function rotateBy(delta: number) {
    setAngle((a) => a + delta);
    setFlippedIndex(null);
  }

  function selectCard(index: number) {
    if (index === activeIndex) {
      setFlippedIndex((f) => (f === index ? null : index));
      return;
    }
    const targetAngle = -index * theta;
    const diff = (((targetAngle - angle) % 360) + 540) % 360 - 180;
    setAngle((a) => a + diff);
    setFlippedIndex(null);
  }

  return (
    <div className={cn('faq-scene', className)}>
      <button type="button" className="faq-nav faq-nav-prev" aria-label="Previous question" onClick={() => rotateBy(theta)}>
        <Icon name="arrow" size={20} className="rotate-180" />
      </button>
      <button type="button" className="faq-nav faq-nav-next" aria-label="Next question" onClick={() => rotateBy(-theta)}>
        <Icon name="arrow" size={20} />
      </button>
      <div
        className="faq-carousel"
        style={{ transform: `rotateY(${angle}deg)` }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? 0;
        }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? touchStartX.current);
          if (diff > 50) rotateBy(-theta);
          else if (diff < -50) rotateBy(theta);
        }}
      >
        {cards.map((card, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={card.question}
              className={cn('faq-card-wrapper', isActive && 'is-active')}
              style={{ transform: `rotateY(${i * theta}deg) translateZ(${radius}px)` }}
              onClick={() => selectCard(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectCard(i);
                }
              }}
            >
              <div className={cn('faq-card-inner', isActive && flippedIndex === i && 'is-flipped')}>
                <div className="faq-card-front">
                  <Icon name={card.icon} size={34} className="faq-card-icon" />
                  <h3 className="faq-card-question">{card.question}</h3>
                  <span className="faq-card-hint">
                    Tap to reveal <Icon name="refresh" size={14} />
                  </span>
                </div>
                <div className="faq-card-back">
                  <Pic photoKey={card.photoKey} alt="" className="faq-card-bg" sizes="26rem" />
                  <div className="faq-card-scrim" />
                  <div className="faq-card-answer">
                    <h4>{card.heading}</h4>
                    <p>{card.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
