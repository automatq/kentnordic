import { Link } from 'react-router-dom';
import Icon from '@/components/ui/Icon';
import { getPhoto } from '@/lib/photos';
import { formatLength, lengthBucket, seasonalityText, tourRegionIds, type Tour } from '@/lib/packages';

interface PackageCardProps {
  tour: Tour;
  regionColors: Map<string, string>;
  regionNames: Map<string, string>;
}

export default function PackageCard({ tour, regionColors, regionNames }: PackageCardProps) {
  const d = tour.data;
  const img = getPhoto(d.heroImage);
  const regionIds = tourRegionIds(tour);

  return (
    <article className="card" data-nights={d.nights} data-length={lengthBucket(tour)} data-regions={regionIds.join(',')}>
      <Link className="card-media" to={`/tours/${tour.id}`} tabIndex={-1} aria-hidden="true">
        <img src={img} alt={d.heroAlt} className="card-img" loading="lazy" />
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
          <Link to={`/tours/${tour.id}`}>{d.name}</Link>
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
          <span className="card-price">Price on request</span>
          <span className="card-cta">
            View itinerary <Icon name="arrow" size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}
