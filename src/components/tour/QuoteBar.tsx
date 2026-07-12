import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';

interface QuoteBarProps {
  code: string;
  inquiryHref: string;
}

/**
 * Mobile-only sticky bottom quote bar for tour detail pages. Desktop keeps
 * the sticky side-card, so this renders <1024px only (CSS). Appears once the
 * hero has scrolled past, and yields whenever the aside (which holds the
 * in-page CTA) or the footer is on screen — the bar should never shout over
 * an existing CTA.
 */
export default function QuoteBar({ code, inquiryHref }: QuoteBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('.thero');
    const aside = document.querySelector('.layout .side');
    const footer = document.querySelector('.site-footer');
    if (!hero) return;

    const state = { heroPassed: false, asideVisible: false, footerVisible: false };
    const apply = () => setVisible(state.heroPassed && !state.asideVisible && !state.footerVisible);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) {
          state.heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        } else if (entry.target === aside) {
          state.asideVisible = entry.isIntersecting;
        } else if (entry.target === footer) {
          state.footerVisible = entry.isIntersecting;
        }
      }
      apply();
    });
    observer.observe(hero);
    if (aside) observer.observe(aside);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="quote-bar" data-visible={visible} inert={!visible}>
      <span className="quote-bar-code tnum">{code}</span>
      <Button href={inquiryHref} size="sm">
        Request a quote
      </Button>
    </div>
  );
}
