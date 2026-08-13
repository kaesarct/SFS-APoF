import itaToEng from '../ita-to-eng.json';

// Alias tra i nomi paese usati in questa app e i nomi Natural Earth usati dal GeoJSON di
// world-atlas (proprietà `properties.name`), per i casi noti in cui divergono. Include sia
// varianti di nomi inglesi, sia gli output non standard del dizionario ita-to-eng.json.
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
  'solomon islands': 'Solomon Is.',
  "china, people's republic of": 'China',
  'kyrgyz republic': 'Kyrgyzstan'
};

// Alcuni paesi non sono nel dizionario ita-to-eng.json (usato altrove per bandiere/PIL).
// Traduzioni aggiuntive usate solo per il matching sulla mappa.
const ITALIAN_NAME_FALLBACKS: Record<string, string> = {
  groenlandia: 'Greenland',
  'guam (usa)': 'Guam',
  'principato di monaco': 'Monaco'
};

export function toWorldMapName(name: string): string {
  return WORLD_MAP_NAME_OVERRIDES[name.trim().toLowerCase()] || name;
}

function italianToEnglish(name: string): string {
  const key = name.trim();
  return (itaToEng as Record<string, string>)[key] || ITALIAN_NAME_FALLBACKS[key.toLowerCase()] || '';
}

// Alcune rilevazioni hanno per bug pregressi il nome italiano anche nel campo "paese_en"
// (submission pubbliche approvate e alcuni import Excel salvano lì il nome selezionato in
// italiano). Si prova prima paese_en così com'è, poi si tenta la traduzione di paese_it (e,
// in subordine, dello stesso paese_en) tramite il dizionario italiano->inglese. Si usa il
// primo candidato che esiste davvero nella mappa registrata; altrimenti il paese resta bianco.
export function resolveCountryMapName(paeseEn: string, paeseIt: string, knownNames: Set<string>): string {
  const candidates = [
    toWorldMapName(paeseEn || ''),
    toWorldMapName(italianToEnglish(paeseIt || '')),
    toWorldMapName(italianToEnglish(paeseEn || ''))
  ];
  return candidates.find(c => c && knownNames.has(c)) || candidates[0];
}
