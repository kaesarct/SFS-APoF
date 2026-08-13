// Alcuni paesi (Russia, Fiji, ...) attraversano l'antimeridiano (180°/-180° di longitudine).
// Il GeoJSON di world-atlas non taglia l'anello in quel punto: ECharts disegna le coordinate
// lng/lat come piano cartesiano semplice (nessuna vera proiezione geografica), quindi traccia
// una linea retta spuria da un lato all'altro della mappa. Si "srotola" la longitudine per
// mantenere il percorso continuo invece di farlo saltare da -180 a +180 (o viceversa).
function pointsClose(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

function unwrapRing(ring: number[][]): number[][] {
  let offset = 0;
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const dLng = ring[i][0] - ring[i - 1][0];
    if (dLng > 180) offset -= 360;
    else if (dLng < -180) offset += 360;
    out.push([ring[i][0] + offset, ring[i][1]]);
  }
  // Alcuni anelli chiusi (es. l'Antartide, che gira quasi per intero attorno al polo) hanno
  // un salto >180° che non è un attraversamento dell'antimeridiano da correggere, ma parte
  // della forma stessa. In quel caso "srotolare" romperebbe la chiusura dell'anello (inizio e
  // fine non coinciderebbero più): si rileva questo caso e si restituisce l'anello originale.
  const wasClosed = pointsClose(ring[0], ring[ring.length - 1]);
  const stillClosed = pointsClose(out[0], out[out.length - 1]);
  if (wasClosed && !stillClosed) return ring;
  return out;
}

export function unwrapAntimeridian<T extends { features: any[] }>(geoJson: T): T {
  geoJson.features.forEach((f: any) => {
    const g = f.geometry;
    if (g.type === 'Polygon') {
      g.coordinates = g.coordinates.map(unwrapRing);
    } else if (g.type === 'MultiPolygon') {
      g.coordinates = g.coordinates.map((poly: number[][][]) => poly.map(unwrapRing));
    }
  });
  return geoJson;
}
