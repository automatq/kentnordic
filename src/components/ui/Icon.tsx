interface IconProps {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}

const paths: Record<string, string> = {
  compass: '<circle cx="12" cy="12" r="9"/><polygon points="16 8 14 14 8 16 10 10 16 8"/>',
  group:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sparkles:
    '<path d="M12 3l1.9 4.8L18.7 9.7 13.9 11.6 12 16.4 10.1 11.6 5.3 9.7 10.1 7.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  car: '<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 13h16v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="15.5" r="0.5"/><circle cx="16.5" cy="15.5" r="0.5"/>',
  route:
    '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H14a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h5.5"/>',
  'map-pin': '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  calendar:
    '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  bed: '<path d="M3 18V7M3 12h15a3 3 0 0 1 3 3v3M3 15h18"/><circle cx="7.5" cy="10.5" r="1.5"/>',
  utensils: '<path d="M4 3v7a2 2 0 0 0 2 2h0V3M6 3v18M18 3c-1.5 0-3 2-3 5s1 4 3 4v9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mountain: '<path d="M3 20 10 7l4 7 2-3 5 9z"/>',
  snowflake:
    '<path d="M12 2v20M4 6l16 12M20 6 4 18M2 12h20"/>',
  leaf: '<path d="M4 20c8 2 16-4 16-14 0 0-9-1-13 3s-3 11-3 11z"/><path d="M4 20 14 10"/>',
  quote: '<path d="M7 7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l-2 4M17 7h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l-2 4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
  tag: '<path d="M12 2H4a2 2 0 0 0-2 2v8l10.6 10.6a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8L12 2z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  pen: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 6V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1"/><circle cx="17" cy="13" r="1"/>',
  crown: '<path d="M3 18h18M4 18 2 8l5 4 5-8 5 8 5-4-2 10"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h0M12 11h0M16 11h0M8 15h0M12 15h0M16 15h0"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/>',
  linkedin: '<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 10v7M7 6.5v.01"/><path d="M11 17v-5M11 12v0a2.5 2.5 0 0 1 5 0v5"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  facebook: '<path d="M15 3h-2a5 5 0 0 0-5 5v2H6v4h2v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3z"/>',
  star: '<path d="m12 3 2.6 5.6 6.2.6-4.6 4.2 1.3 6.1L12 16.8 6.5 19.5l1.3-6.1L3.2 9.2l6.2-.6z"/>',
  play: '<path d="M7 4.5 19 12 7 19.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  waterfall: '<path d="M6 3v6c0 1 .5 2 1.5 2.5"/><path d="M12 3v5c0 1.3.7 2.4 1.8 3"/><path d="M18 3v4c0 1.6.9 3 2 3.5"/><path d="M4 21c1-4 2.5-9 4-9s2 5 4 5 2-6 4-6 2.5 6 4 6"/>',
  printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
  droplet: '<path d="M12 2.5c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
};

export default function Icon({ name, size = 24, className = '', title }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: `${title ? `<title>${title}</title>` : ''}${paths[name] ?? paths.compass}` }}
    />
  );
}
