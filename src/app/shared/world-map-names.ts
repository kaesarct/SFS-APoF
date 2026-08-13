// Alias tra i nomi paese usati in questa app (countries-data.json, Firestore) e i nomi
// Natural Earth usati dal GeoJSON di world-atlas (proprietà `properties.name`), per i
// pochi casi noti in cui divergono. Paesi non in questa tabella sono passati inalterati
// e devono già coincidere col nome usato da world-atlas.
export const WORLD_MAP_NAME_OVERRIDES: Record<string, string> = {
  'united states': 'United States of America',
  'czech republic': 'Czechia',
  'congo, dem. rep. of the': 'Dem. Rep. Congo',
  'congo, republic of': 'Congo',
  'south sudan, republic of': 'S. Sudan',
  'russian federation': 'Russia',
  'korea, republic of': 'South Korea',
  'north macedonia': 'Macedonia',
  'eswatini': 'eSwatini',
  'bosnia and herzegovina': 'Bosnia and Herz.',
  'central african republic': 'Central African Rep.',
  'dominican republic': 'Dominican Rep.',
  'equatorial guinea': 'Eq. Guinea',
  'solomon islands': 'Solomon Is.'
};

export function toWorldMapName(paeseEn: string): string {
  return WORLD_MAP_NAME_OVERRIDES[paeseEn.trim().toLowerCase()] || paeseEn;
}
