/** Working time assumed in a year: 2000 hours. */
export const WORK_MINUTES_PER_YEAR = 2000 * 60;

const GDP_YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

export interface ItalyReference {
  euroPer100g: number;
  wagePerMinute: number;
  minutesPer100g: number;
}

export function euroPer100g(priceEur: number, grams: number): number {
  return grams > 0 ? (priceEur / grams) * 100 : 0;
}

export function wagePerMinute(gdpPerCapitaEur: number): number {
  return gdpPerCapitaEur > 0 ? gdpPerCapitaEur / WORK_MINUTES_PER_YEAR : 0;
}

export function minutesPer100g(euro100g: number, gdpPerCapitaEur: number): number {
  return gdpPerCapitaEur > 0 ? (euro100g / gdpPerCapitaEur) * WORK_MINUTES_PER_YEAR : 0;
}

/** Over/undervaluation (%) of a price per 100 g against the Italian reference price. */
export function valuationPct(euro100g: number, referenceEuro100g: number): number {
  return euro100g > 0 && referenceEuro100g > 0 ? (euro100g / referenceEuro100g - 1) * 100 : 0;
}

/**
 * Most recent usable GDP per capita from a nutella-data.json series.
 * Keys look like "2026 EUR (0.87)"; values may be "no data".
 */
export function latestGdp(series: Record<string, unknown> | undefined): { value: number; year: number } | null {
  if (!series) return null;
  const keys = Object.keys(series);
  for (const year of GDP_YEARS) {
    const key = keys.find(k => k.startsWith(year));
    if (!key) continue;
    const value = parseFloat(String(series[key]));
    if (value > 0) return { value, year: Number(year) };
  }
  return null;
}

export function italyReferenceFrom(priceEur: number, grams: number, gdpPerCapitaEur: number): ItalyReference {
  const euro100g = euroPer100g(priceEur, grams);
  return {
    euroPer100g: euro100g,
    wagePerMinute: wagePerMinute(gdpPerCapitaEur),
    minutesPer100g: minutesPer100g(euro100g, gdpPerCapitaEur)
  };
}

/** Used when Firestore is unreachable: Italian reading of 2026-06-18 (6.54 € for 750 g, GDP per capita 39,918 €). */
export const FALLBACK_ITALY_REFERENCE: ItalyReference = italyReferenceFrom(6.54, 750, 39918.33);

interface ReadingLike {
  paese_it?: string;
  paese_en?: string;
  data_video?: string;
  prezzo_euro: number;
  peso_grammi: number;
  pil_pro_capite_eur: number;
}

const isItaly = (r: ReadingLike) =>
  ['italia', 'italy'].includes((r.paese_it ?? '').toLowerCase()) || ['italia', 'italy'].includes((r.paese_en ?? '').toLowerCase());

/** Italian reference from the most recent valid Italian reading, or the fallback. */
export function findItalyReference(readings: ReadingLike[]): ItalyReference {
  const latest = readings
    .filter(r => isItaly(r) && r.prezzo_euro > 0 && r.peso_grammi > 0 && r.pil_pro_capite_eur > 0)
    .sort((a, b) => (b.data_video ?? '').localeCompare(a.data_video ?? ''))[0];
  return latest ? italyReferenceFrom(latest.prezzo_euro, latest.peso_grammi, latest.pil_pro_capite_eur) : FALLBACK_ITALY_REFERENCE;
}
