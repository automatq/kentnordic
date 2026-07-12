import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/classNames';
import type { ItineraryDay as Day } from '@/lib/content';

interface ItineraryDayProps {
  day: Day;
  last?: boolean;
  /** Anchor id for the day-jump nav, e.g. `day-4`. */
  id?: string;
  /** First day renders expanded; the rest start collapsed for scannability. */
  defaultOpen?: boolean;
}

const mealLabels: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' };

export default function ItineraryDay({ day, last = false, id, defaultOpen = false }: ItineraryDayProps) {
  return (
    <article id={id} className={cn('day', last && 'is-last')}>
      <div className="day-rail" aria-hidden="true">
        <span className="day-num">{day.day}</span>
      </div>

      <div className="day-body">
        <details className="day-details" open={defaultOpen || undefined}>
          <summary className="day-head-toggle">
            <span className="day-kicker">Day {day.day}</span>
            <h3 className="day-title">{day.title}</h3>
            {day.summary && <span className="day-summary">{day.summary}</span>}
            <Icon name="arrow-down" size={18} className="day-chevron" />
          </summary>

          <div className="day-detail-body">
            {day.meals.length > 0 && (
              <ul className="meals" aria-label="Meals included">
                {day.meals.map((m) => (
                  <li key={m} className="meal" title={mealLabels[m]}>
                    <Icon name="utensils" size={13} />
                    {mealLabels[m]}
                  </li>
                ))}
              </ul>
            )}

            {day.places.length > 0 && (
              <ul className="places">
                {day.places.map((p) => (
                  <li key={p} className="place">
                    <Icon name="map-pin" size={14} />
                    {p}
                  </li>
                ))}
              </ul>
            )}

            {day.segments.length > 0 && (
              <ol className="segments">
                {day.segments.map((s, index) => (
                  <li key={`${s.from}-${s.to}-${index}`} className="segment">
                    <span className="seg-route">
                      {s.from} <Icon name="arrow" size={14} className="seg-arrow" /> {s.to}
                    </span>
                    <span className="seg-meta">{[s.km ? `±${s.km} km` : null, s.duration ? `±${s.duration}` : null].filter(Boolean).join(' · ')}</span>
                    {s.note && <span className="seg-note">{s.note}</span>}
                  </li>
                ))}
              </ol>
            )}

            {day.included.length > 0 && (
              <div className="incl">
                <p className="incl-label">Included</p>
                <ul>
                  {day.included.map((i) => (
                    <li key={i}>
                      <Icon name="check" size={16} className="incl-icon" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day.optional.length > 0 && (
              <div className="opt">
                <div className="opt-head">
                  <p className="opt-label">Optional add-ons</p>
                  <Badge tone="optional">At extra cost</Badge>
                </div>
                <ul>
                  {day.optional.map((o) => (
                    <li key={`${o.name}-${o.duration ?? ''}`}>
                      <Icon name="plus" size={15} className="opt-icon" />
                      <span>
                        <span className="opt-name">{o.name}</span>
                        {o.duration && <span className="opt-dur"> · {o.duration}</span>}
                        {o.availability && <span className="opt-avail"> · {o.availability}</span>}
                        {o.note && <span className="opt-note">{o.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="stay">
              {day.hotel ? (
                <>
                  <Icon name="bed" size={16} />
                  <span>
                    Overnight · <strong>{day.hotel.name}</strong>
                    {day.hotel.tier && ` ${day.hotel.tier}`}
                    {day.hotel.orSimilar && ' or similar'}
                  </span>
                </>
              ) : day.day === 1 ? (
                <>
                  <Icon name="moon" size={16} />
                  <span>Overnight flight</span>
                </>
              ) : (
                <>
                  <Icon name="route" size={16} />
                  <span>Service ends - departure day</span>
                </>
              )}
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}
