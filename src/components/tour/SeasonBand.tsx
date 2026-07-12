import type { Tour } from '@/lib/content';

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Twelve-month availability band: one cell per month, excluded months
 * greyed. A single generated aria-label carries the meaning; the cells are
 * decorative for assistive tech.
 */
export default function SeasonBand({ tour }: { tour: Tour }) {
  const excluded = new Set(tour.data.seasonality.excludedMonths);
  const label =
    excluded.size === 0
      ? 'Available all twelve months'
      : `Available all year except ${[...excluded].map((m) => MONTH_NAMES[m - 1]).join(' and ')}`;

  return (
    <div className="season-band" role="img" aria-label={label}>
      {MONTH_INITIALS.map((initial, i) => (
        <span key={i} className={excluded.has(i + 1) ? 'season-cell is-off' : 'season-cell'} aria-hidden="true">
          {initial}
        </span>
      ))}
    </div>
  );
}
