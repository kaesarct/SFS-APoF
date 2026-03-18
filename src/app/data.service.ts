import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDocs, writeBatch, deleteDoc, setDoc, query, orderBy, limit } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { read, utils } from 'xlsx';

export interface IndexData {
  history: any[];
  rankings: any[];
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  constructor() { }

  // --- PUBLIC DATA ACCESS ---

  // Kept for backward compatibility / fallback
  getMockData(): IndexData {
    return {
      history: [
        { country: "Italy", date: "2023-01-01", value: 85.5 },
      ],
      rankings: [
        { country: "Italy", value: 85.5, change: "+1.2" },
      ]
    };
  }

  // --- PUBLIC SUBMISSION ---

  async submitLink(url: string): Promise<void> {
    try {
      const submissionsRef = collection(this.firestore, 'submissions');
      await addDoc(submissionsRef, {
        url,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error submitting link', e);
      throw e;
    }
  }

  async uploadPhoto(file: File): Promise<string> {
    try {
      const timestamp = new Date().getTime();
      const uniqueName = `${timestamp}_${file.name}`;
      const storageRef = ref(this.storage, `uploads/${uniqueName}`);

      const result = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(result.ref);
      return url;
    } catch (e) {
      console.error('Error uploading photo', e);
      throw e;
    }
  }

  async submitData(data: any): Promise<void> {
    try {
      const submissionsRef = collection(this.firestore, 'submissions');
      await addDoc(submissionsRef, {
        ...data,
        timestamp: new Date().toISOString(),
        status: 'pending' // For admin review
      });
    } catch (e) {
      console.error('Error submitting data', e);
      throw e;
    }
  }

  // --- ADMIN / UPLOAD LOGIC ---

  async clearDatabase(): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Clear old collections
    const historySnap = await getDocs(collection(this.firestore, 'history'));
    historySnap.forEach(d => batch.delete(d.ref));

    const rankingsSnap = await getDocs(collection(this.firestore, 'rankings'));
    rankingsSnap.forEach(d => batch.delete(d.ref));

    // Clear new collections
    const areasSnap = await getDocs(collection(this.firestore, 'areas'));
    areasSnap.forEach(d => batch.delete(d.ref));

    const countriesSnap = await getDocs(collection(this.firestore, 'countries'));
    countriesSnap.forEach(d => batch.delete(d.ref));

    const measurementsSnap = await getDocs(collection(this.firestore, 'measurements'));
    measurementsSnap.forEach(d => batch.delete(d.ref));

    await batch.commit();
  }

  async parseAndUploadExcel(file: File): Promise<string> {
    const data = await file.arrayBuffer();
    const workbook = read(data, { cellDates: true });

    if (workbook.SheetNames.length === 0) throw new Error('Excel vuoto');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = utils.sheet_to_json(sheet) as any[];

    if (rows.length === 0) throw new Error('Nessun dato trovato nel foglio');

    // Maps to avoid duplicates
    const areasMap = new Map<string, string>(); // Name -> ID
    const countriesMap = new Map<string, string>(); // Name -> ID

    const batch = writeBatch(this.firestore);
    let opCount = 0;

    // Helper to generate ID
    const cleanId = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    for (const row of rows) {
      // Expected Excel Columns (loose matching): 
      // Area, Paese, Data, Prezzo Originale, Cambio, Prezzo Euro, Peso, PIL, Anno PIL

      const areaName = (row['Area'] || row['area'] || row['Area Geografica'] || 'Unknown').trim();
      const countryName = (row['Paese'] || row['Country'] || row['paese']).trim();
      const dateRaw = row['Data'] || row['Data Video Nic'] || row['Date'];

      if (!countryName || !dateRaw) continue;

      const dateVal = dateRaw instanceof Date ? dateRaw.toISOString().split('T')[0] : String(dateRaw).trim();

      // Values
      const priceOriginal = parseFloat(row['Prezzo Originale'] || row['Prezzo nutella in valuta'] || 0);
      const exchangeRate = parseFloat(row['Cambio'] || row['Tasso Cambio'] || row['Tasso di cambio del video'] || 1);
      const priceEuro = parseFloat(row['Prezzo Euro'] || row['NUTELLA IN EURO'] || row['Euro/100g'] || 0);

      const weight = parseInt(row['Peso'] || row['Peso (g)'] || row['Quantità (g)'] || 750);
      const gdpPerCapita = parseFloat(row['PIL'] || row['PIL pro capite'] || 0);
      const gdpYear = parseInt(row['Anno PIL'] || row['Anno del dato pil'] || new Date().getFullYear());

      // 1. AREA
      let areaId = areasMap.get(areaName);
      if (!areaId) {
        areaId = cleanId(areaName);
        if (!areasMap.has(areaName)) {
          batch.set(doc(this.firestore, 'areas', areaId), { nome: areaName });
          areasMap.set(areaName, areaId);
          opCount++;
        }
      }

      // 2. COUNTRY
      let countryId = countriesMap.get(countryName);
      if (!countryId) {
        countryId = cleanId(countryName);
        if (!countriesMap.has(countryName)) {
          batch.set(doc(this.firestore, 'countries', countryId), {
            nome: countryName,
            area_id: areaId
          });
          countriesMap.set(countryName, countryId);
          opCount++;
        }
      }

      // 3. MEASUREMENT (Rilevazione)
      const measurementId = `${countryId}_${dateVal}`;
      const measurementData = {
        paese_id: countryId,
        data_video: dateVal,
        prezzo_originale: priceOriginal,
        tasso_cambio: exchangeRate,
        prezzo_euro: priceEuro,
        peso_grammi: weight,
        pil_pro_capite_eur: gdpPerCapita,
        anno_pil: gdpYear
      };

      batch.set(doc(this.firestore, 'measurements', measurementId), measurementData);
      opCount++;
    }

    await batch.commit();
    return `Caricati ${opCount} record (Aree, Paesi, Rilevazioni).`;
  }

  // --- ANALYTICS VIEW ---
  async getAnalyticsData(): Promise<any[]> {
    console.log('Calculating Analytics...');

    try {
      // Fetch all needed collections
      console.log('Fetching collections...');
      const [areasSnap, countriesSnap, measurementsSnap] = await Promise.all([
        getDocs(collection(this.firestore, 'areas')),
        getDocs(collection(this.firestore, 'countries')),
        getDocs(collection(this.firestore, 'measurements'))
      ]);
      console.log('Collections fetched:', {
        areas: areasSnap.size,
        countries: countriesSnap.size,
        measurements: measurementsSnap.size
      });

      console.log('Mapping areas and countries...');
      const areas = new Map(areasSnap.docs.map(d => [d.id, d.data()['nome'] || 'Unknown Area']));
      const countries = new Map(countriesSnap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));

      // Debug: Log all country names to see what is available
      const allCountryNames = [...countries.values()].map((c: any) => c.nome);
      console.log('Available Countries:', allCountryNames);

      // Find Italy ID for comparison
      let italyId = [...countries.values()].find((c: any) =>
        (c.nome && (c.nome.trim().toLowerCase() === 'italy' || c.nome.trim().toLowerCase() === 'italia'))
      )?.id;

      console.log('Italy ID found:', italyId);

      if (!italyId) {
        console.warn('Italy/Italia not found! Using first available country as fallback to prevent crash.');
        italyId = [...countries.keys()][0];
      }

      // First pass: Prepare measurements
      console.log('Processing measurements...');
      let rawData: any[] = measurementsSnap.docs.map(d => {
        const m = d.data();
        const c: any = countries.get(m['paese_id']);
        const weight = m['peso_grammi'] || 750;
        return {
          ...m,
          paese: c?.nome || 'Unknown',
          area: areas.get(c?.area_id) || 'Unknown',
          local_per_100g: (m['prezzo_originale'] / weight) * 100,
          euro_per_100g: (m['prezzo_euro'] / weight) * 100, // protect div by zero
          nutella_index_percent: (m['prezzo_euro'] / (m['pil_pro_capite_eur'] || 1)) * 100,
          minuti_lavoro_necessari: (m['prezzo_euro'] / (m['pil_pro_capite_eur'] || 1)) * 2000 * 60,
          price_per_kg: (m['prezzo_euro'] / weight) * 1000
        };
      });

      console.log('Processed raw measurements:', rawData.length);

      // Calc Italy stats for Reference (latest date)
      const italyData = rawData.filter(d => d.paese_id === italyId).sort((a: any, b: any) => {
        const da = a['data_video'] || '';
        const db = b['data_video'] || '';
        return db.localeCompare(da);
      })[0];

      const italyPricePerKg = italyData ? italyData.price_per_kg : 1;
      const italyWorkMins = italyData ? italyData.minuti_lavoro_necessari : 1;
      const italyLocalPer100g = italyData ? italyData.local_per_100g : 1;
      console.log('Reference Italy Data:', italyData ? 'Found' : 'Not Found');

      // Second pass: Comparative metrics
      return rawData.map((d: any) => {
        return {
          ...d,
          nutella_ppp_rate: d['local_per_100g'] / (italyLocalPer100g || 1),
          affordability_gap: ((d.minuti_lavoro_necessari - italyWorkMins) / italyWorkMins) * 100,
          nutella_shadow_gdp: (d['prezzo_euro'] / d.nutella_index_percent) * 100
        };
      });
    } catch (e) {
      console.error('Error in getAnalyticsData:', e);
      throw e;
    }
  }

  // Compatibility wrapper
  async getRealData(): Promise<IndexData> {
    try {
      const analytics = await this.getAnalyticsData();
      // Map to old structure for Dashboard compatibility (initially)
      const history = analytics.map((a: any) => ({
        country: a.paese,
        date: a.data_video,
        value: a.euro_per_100g // Map to old 'value'
      }));

      // Latest for ranking
      const latestMap = new Map();
      analytics.forEach((a: any) => {
        const existing = latestMap.get(a.paese);
        if (!existing || a.data_video > existing.data_video) {
          latestMap.set(a.paese, a);
        }
      });

      const rankings = Array.from(latestMap.values()).map((a: any) => ({
        country: a.paese,
        local_price: a.local_per_100g || 0,
        ppp_rate: a.nutella_ppp_rate || 0,
        exchange_rate: a.tasso_cambio || 1,
        valuation_percentage: a.tasso_cambio && a.tasso_cambio > 0 ? ((a.nutella_ppp_rate - a.tasso_cambio) / a.tasso_cambio) * 100 : 0,
        nutella_index_minutes: a.minuti_lavoro_necessari || 0,
        value: a.euro_per_100g,
        change: a.affordability_gap.toFixed(1) + '%', // Re-purpose change for gap?
        area: a.area
      })).sort((a: any, b: any) => b.valuation_percentage - a.valuation_percentage);

      return { history, rankings };
    } catch (e) {
      console.error(e);
      return this.getMockData(); // fallback
    }
  }

  // --- SINGLE ENTRY ADMIN ---
  async addRilevazione(item: any): Promise<void> {
    const cleanId = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    const areaName = (item.area || 'Unknown').trim();
    const countryName = item.country.trim();

    let areaId = cleanId(areaName);
    let countryId = cleanId(countryName);

    // Ensure Area exists
    const areaRef = doc(this.firestore, 'areas', areaId);
    await setDoc(areaRef, { nome: areaName }, { merge: true });

    // Ensure Country exists
    const countryRef = doc(this.firestore, 'countries', countryId);
    await setDoc(countryRef, { nome: countryName, area_id: areaId }, { merge: true });

    // Add Measurement
    const measurementId = `${countryId}_${item.date}`;
    const measurementDoc = doc(this.firestore, 'measurements', measurementId);
    await setDoc(measurementDoc, {
      paese_id: countryId,
      data_video: item.date,
      prezzo_originale: item.priceOriginal,
      tasso_cambio: item.exchangeRate,
      prezzo_euro: item.priceEuro,
      peso_grammi: item.weight,
      pil_pro_capite_eur: item.gdp,
      anno_pil: item.gdpYear
    });
  }

  async getAdminHistory(limitCount?: number): Promise<any[]> {
    const data = await this.getAnalyticsData();

    // Sort by date desc with safety check
    const sorted = data.sort((a, b) => {
      const dateA = a.data_video || '';
      const dateB = b.data_video || '';
      return dateB.localeCompare(dateA);
    });

    return limitCount ? sorted.slice(0, limitCount) : sorted;
  }

  async deleteHistoryItem(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'measurements', id));
  }
}
