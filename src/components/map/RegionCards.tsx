import { Link } from 'react-router-dom';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/motion/Reveal';
import Pic from '@/components/ui/Pic';
import { getRegions, nightsLabel, toursForRegion } from '@/lib/packages';

export default function RegionCards() {
  const data = getRegions().map((region) => ({
    region,
    tours: toursForRegion(region.id),
  }));

  return (
    <div className="region-grid">
      {data.map(({ region, tours }, i) => (
        <Reveal as="article" key={region.id} delay={(i % 4) * 80} className="region-card" id={`region-card-${region.id}`}>
          <div className="rc-media">
            <Pic photoKey={region.data.image ?? `region-${region.id}`} alt={`${region.data.name} region of Iceland`} className="rc-img" sizes="(min-width: 1024px) 23vw, 46vw" />
            <span className="rc-band" style={{ background: region.data.color }} />
          </div>
          <div className="rc-body">
            <p className="rc-tagline">{region.data.tagline}</p>
            <h3 className="rc-title">{region.data.name}</h3>
            <p className="rc-blurb">{region.data.blurb}</p>
            <div className="rc-tours">
              {tours.map((t) => (
                <Link key={t.id} className="rc-tour" to={`/tours/${t.id}`}>
                  {t.data.name}
                  <span className="rc-tour-n">{nightsLabel(t)}</span>
                </Link>
              ))}
            </div>
            <Link className="rc-link" to={`/tours?region=${region.id}`}>
              Tours visiting {region.data.name}
              <Icon name="arrow" size={15} />
            </Link>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
