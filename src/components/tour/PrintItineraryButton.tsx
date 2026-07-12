import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

/**
 * "Print / save PDF" for the itinerary — the artifact agencies forward to
 * their clients. Closed <details> content doesn't print, so both the button
 * and Cmd/Ctrl+P (via beforeprint) force every day card open first;
 * afterprint restores whichever were closed.
 */
export default function PrintItineraryButton() {
  useEffect(() => {
    let reclose: HTMLDetailsElement[] = [];
    const openAll = () => {
      reclose = [...document.querySelectorAll<HTMLDetailsElement>('details.day-details:not([open])')];
      reclose.forEach((el) => el.setAttribute('open', ''));
    };
    const restore = () => {
      reclose.forEach((el) => el.removeAttribute('open'));
      reclose = [];
    };
    window.addEventListener('beforeprint', openAll);
    window.addEventListener('afterprint', restore);
    return () => {
      window.removeEventListener('beforeprint', openAll);
      window.removeEventListener('afterprint', restore);
    };
  }, []);

  return (
    <Button variant="secondary" size="sm" className="side-print" onClick={() => window.print()}>
      <Icon name="printer" size={16} /> Print / save PDF
    </Button>
  );
}
