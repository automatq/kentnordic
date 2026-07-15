/**
 * Destination `type` → display glyph/label, shared by the destinations map
 * panel and the tour-walkthrough pin tooltips. Glyph names reference the
 * Icon.tsx registry.
 */
export const TYPE_ICON: Record<string, string> = {
  city: 'compass',
  airport: 'route',
  landmark: 'map-pin',
  canyon: 'mountain',
  crater: 'mountain',
  glacier: 'snowflake',
  waterfall: 'waterfall',
  lagoon: 'droplet',
  beach: 'droplet',
  geothermal: 'droplet',
};

export const TYPE_LABEL: Record<string, string> = {
  city: 'City',
  airport: 'Airport',
  landmark: 'Landmark',
  canyon: 'Canyon',
  crater: 'Crater',
  glacier: 'Glacier',
  waterfall: 'Waterfall',
  lagoon: 'Lagoon',
  beach: 'Beach',
  geothermal: 'Geothermal area',
};
