import { Link } from 'react-router-dom';
import { useTilt } from '@/lib/useTilt';
import Icon from '@/components/ui/Icon';
import Pic from '@/components/ui/Pic';
import { formatLength, lengthBucket, priceText, seasonalityText, tourRegionIds, type Tour } from '@/lib/packages';

interface PackageCardProps {
  tour: Tour;
  regionColors: Map<string, string>;
  regionNames: Map<string, string>;
}

export default function PackageCard({ tour, regionColors, regionNames }: PackageCardProps) {
  const tiltRef = useTilt<HTMLElement>();
  const d = tour.data;
  const regionIds = tourRegionIds(tour);

  return (
    <article ref={tiltRef} className="card" data-nights={d.nights} data-length={lengthBucket(tour)} data-regions={regionIds.join(',')}>
      <Link className="card-media" viewTransition to={`/tours/${tour.id}`} tabIndex={-1} aria-hidden="true">
        <Pic photoKey={d.heroImage} alt={d.heroAlt} className="card-img" sizes="(min-width: 1024px) 30vw, 92vw" />
        <span className="card-code">{d.code}</span>
        <span className="card-nights">{d.nights} nights</span>
      </Link>

      <div className="card-body">
        <div className="card-regions" aria-label="Regions">
          {regionIds.map((id) => (
            <span key={id} className="chip" style={{ '--dot': regionColors.get(id) ?? '#ccc' } as React.CSSProperties}>
              <span className="chip-dot" />
              {regionNames.get(id)}
            </span>
          ))}
        </div>

        <h3 className="card-title">
          <Link viewTransition to={`/tours/${tour.id}`}>{d.name}</Link>
        </h3>
        <p className="card-summary">{d.summary}</p>

        <dl className="card-facts">
          <div>
            <Icon name="calendar" size={15} />
            <dd>{formatLength(tour)}</dd>
          </div>
          <div>
            <Icon name="snowflake" size={15} />
            <dd>{seasonalityText(tour)}</dd>
          </div>
        </dl>

        <div className="card-foot">
          <span className="card-price">{priceText(tour)}</span>
          <span className="card-cta">
            View itinerary <Icon name="arrow" size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}
