import {
  FALLBACK_ITALY_REFERENCE, euroPer100g, findItalyReference, latestGdp, minutesPer100g, valuationPct, wagePerMinute
} from './nutella-math';

describe('nutella-math', () => {
  it('normalises a price to 100 g', () => {
    expect(euroPer100g(6.54, 750)).toBeCloseTo(0.872, 3);
    expect(euroPer100g(5, 0)).toBe(0);
  });

  it('derives wage per minute from GDP per capita over 2000 working hours', () => {
    expect(wagePerMinute(120000)).toBe(1);
    expect(wagePerMinute(0)).toBe(0);
  });

  it('computes minutes of work for 100 g', () => {
    expect(minutesPer100g(1, 120000)).toBe(1);
    expect(minutesPer100g(0.872, 39918.33)).toBeCloseTo(2.62, 2);
    expect(minutesPer100g(1, 0)).toBe(0);
  });

  it('computes valuation against the reference price', () => {
    expect(valuationPct(1.1, 1)).toBeCloseTo(10, 6);
    expect(valuationPct(0.9, 1)).toBeCloseTo(-10, 6);
    expect(valuationPct(1, 0)).toBe(0);
  });

  it('picks the most recent usable GDP from year-prefixed keys', () => {
    expect(latestGdp({ '2025 EUR (0.85)': 100, '2026 EUR (0.87)': 'no data', '2024 EUR (0.9)': 90 })).toEqual({ value: 100, year: 2025 });
    expect(latestGdp({ '2020 EUR (0.85)': 'no data' })).toBeNull();
    expect(latestGdp(undefined)).toBeNull();
  });

  it('builds the Italian reference from the latest Italian reading', () => {
    const ref = findItalyReference([
      { paese_it: 'Italia', data_video: '2025-01-01', prezzo_euro: 3, peso_grammi: 400, pil_pro_capite_eur: 36000 },
      { paese_it: 'Italia', data_video: '2026-06-18', prezzo_euro: 6.54, peso_grammi: 750, pil_pro_capite_eur: 39918.33 },
      { paese_it: 'Francia', data_video: '2026-07-01', prezzo_euro: 9, peso_grammi: 750, pil_pro_capite_eur: 40000 }
    ]);
    expect(ref.euroPer100g).toBeCloseTo(0.872, 3);
    expect(ref.minutesPer100g).toBeCloseTo(2.62, 2);
  });

  it('falls back when there is no valid Italian reading', () => {
    expect(findItalyReference([{ paese_en: 'Italy', prezzo_euro: 5, peso_grammi: 400, pil_pro_capite_eur: 0 }])).toBe(FALLBACK_ITALY_REFERENCE);
  });
});
