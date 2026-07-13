/*
 * The hero's animated isometric SVG cubes — extracted verbatim from
 * HomePage so it can serve as the permanent 2D fallback beneath the
 * WebGL glacier crystal (mobile, reduced-motion, no-WebGL, chunk errors).
 */

const CUBE_FACES = [
  { points: '0,0 -50,-28.87 0,-57.74 50,-28.87' },
  { points: '-50,-28.87 -50,28.87 0,57.74 0,0' },
  { points: '0,0 0,57.74 50,28.87 50,-28.87' },
];

const heroClusters: Array<{ x: number; y: number; fills: Array<string | null>; startDelay: number }> = [
  // Top faces pick up the logo's gold/coral spectrum so the fallback carries
  // the same brand as the WebGL crystal; side faces stay neutral for structure.
  { x: 0, y: 0, fills: ['accent-100', 'white', 'line'], startDelay: 0.2 },
  { x: -50, y: 86.6, fills: ['brand-coral', 'beige', 'white'], startDelay: 0.35 },
  { x: 100, y: 28.87, fills: ['white', 'line', 'beige'], startDelay: 0.5 },
  { x: 50, y: -86.6, fills: [null, 'beige', 'white'], startDelay: 0.65 },
  { x: -100, y: -28.87, fills: ['brand-gold', 'cream', 'line'], startDelay: 0.75 },
];

const heroLines = [
  { x1: 150, y1: 0, x2: 150, y2: 175, delay: 0 },
  { x1: 250, y1: 40, x2: 250, y2: 120, delay: 0.05 },
  { x1: 300, y1: 80, x2: 300, y2: 200, delay: 0.1 },
  { x1: 100, y1: 100, x2: 100, y2: 260, delay: 0.15 },
];

const heroTailLines = [
  { x1: 200, y1: 257.74, x2: 200, y2: 350, delay: 1.0 },
  { x1: 300, y1: 287.74, x2: 300, y2: 380, delay: 1.05 },
];

export default function HeroCubesArt() {
  return (
    <svg viewBox="0 0 400 400" className="home-hero-svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      {heroLines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          strokeWidth="1"
          style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: `${l.delay}s` }}
        />
      ))}
      {heroClusters.map((cluster, ci) => (
        <g key={ci} transform={`translate(${200 + cluster.x}, ${200 + cluster.y})`}>
          {CUBE_FACES.map((face, fi) => {
            const fill = cluster.fills[fi];
            if (!fill) return null;
            const delay = cluster.startDelay + fi * 0.05;
            return (
              <polygon
                key={fi}
                points={face.points}
                style={{
                  fill: `var(--color-${fill})`,
                  stroke: 'currentColor',
                  strokeDasharray: 1000,
                  animation: 'home-draw-line 2s ease-out both, home-fade-block 2s ease-out both',
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </g>
      ))}
      <polyline
        points="50,258.87 100,287.74 150,258.87 150,201.13"
        strokeWidth="1"
        style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: '0.9s' }}
      />
      <polyline
        points="250,258.87 300,287.74 350,258.87 350,201.13"
        strokeWidth="1"
        style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: '0.95s' }}
      />
      {heroTailLines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          strokeWidth="1"
          style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: `${l.delay}s` }}
        />
      ))}
    </svg>
  );
}
