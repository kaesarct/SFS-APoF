import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDocs, writeBatch, deleteDoc, setDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { read, utils } from 'xlsx';

export interface Rilevazione {
  id?: string;
  paese_it: string;
  paese_en: string;
  area: string;
  data_video: string;
  prezzo_originale: number;
  tasso_cambio: number;
  prezzo_euro: number;
  peso_grammi: number;
  euro_per_100g: number;
  pil_pro_capite_eur: number;
  anno_pil: number;
  minutes_per_100g: number;
}

export interface PaeseConfig {
  id?: string;
  paese_en: string;
  paese_it: string;
  currency: string;
  currency_code: string;
  exchange_rate: number;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  private cleanId = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

  // --- RILEVAZIONI ---

  private rilevazioniCache: Rilevazione[] | null = null;

  async getRilevazioni(force = false): Promise<Rilevazione[]> {
    if (this.rilevazioniCache && !force) return this.rilevazioniCache;

    const [measSnap, counSnap, areaSnap] = await Promise.all([
      getDocs(collection(this.firestore, 'measurements')),
      getDocs(collection(this.firestore, 'countries')),
      getDocs(collection(this.firestore, 'areas'))
    ]);

    const areasMap = new Map();
    areaSnap.forEach(d => areasMap.set(d.id, d.data()['nome']));

    const countriesMap = new Map();
    counSnap.forEach(d => {
       const cd = d.data();
       countriesMap.set(d.id, {
           nome: cd['nome'],
           areaName: areasMap.get(cd['area_id']) || 'Unknown',
           pil_data: cd['pil_data'] || {}
       });
    });

    this.rilevazioniCache = measSnap.docs.map(d => {
      const data = d.data();
      const p = countriesMap.get(data['paese_id']);
      
      const euro_per_100g = data['peso_grammi'] > 0 ? (data['prezzo_euro'] / data['peso_grammi']) * 100 : 0;
      
      // Prioritize video PIL (can be named pil_video_eur or pil_pro_capite_eur in db), else get the 2024 GDP 
      const dbPil = Number(data['pil_video_eur']) || Number(data['pil_pro_capite_eur']) || 0;
      const pil = dbPil > 0 ? dbPil : (p?.pil_data?.['2024'] || 0);
      
      const minutes_per_100g = pil > 0 ? ((euro_per_100g / pil) * 2000 * 60) : 0;

      return {
        id: d.id,
        paese_it: p?.nome || data['paese_id'],
        paese_en: p?.nome || data['paese_id'],
        area: p?.areaName || 'Unknown',
        data_video: data['data_video'] || '',
        prezzo_originale: data['prezzo_originale'] || 0,
        tasso_cambio: data['tasso_cambio'] || 1,
        prezzo_euro: data['prezzo_euro'] || 0,
        peso_grammi: data['peso_grammi'] || 750,
        euro_per_100g: euro_per_100g,
        pil_pro_capite_eur: pil,
        anno_pil: data['anno_pil_video'] || 2024,
        minutes_per_100g: minutes_per_100g
      } as Rilevazione;
    });

    return this.rilevazioniCache;
  }

  async saveRilevazione(r: Rilevazione): Promise<void> {
    // Write back to the new schema
    const paeseId = this.cleanId(r.paese_en);
    const id = r.id || `${paeseId}_${r.data_video}`;
    
    // Save minimal data in measurements
    const measureData = {
      paese_id: paeseId,
      data_video: r.data_video,
      prezzo_originale: r.prezzo_originale,
      tasso_cambio: r.tasso_cambio,
      prezzo_euro: r.prezzo_euro,
      peso_grammi: r.peso_grammi,
      pil_video_eur: r.pil_pro_capite_eur,
      anno_pil_video: r.anno_pil
    };
    
    await setDoc(doc(this.firestore, 'measurements', id), measureData);
    this.rilevazioniCache = null;
  }

  async deleteRilevazione(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'measurements', id));
    this.rilevazioniCache = null;
  }

  async updateRilevazioniCalculations(updates: { id: string, euro: number, min: number }[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const u of updates) {
      batch.update(doc(this.firestore, 'measurements', u.id), {
        euro_per_100g: u.euro,
        minutes_per_100g: u.min
      });
    }
    await batch.commit();
    this.rilevazioniCache = null;
  }

  async importRilevazioniFromExcel(file: File): Promise<string> {
    const wb = read(await file.arrayBuffer(), { cellDates: true });
    if (!wb.SheetNames.length) throw new Error('Excel vuoto');
    const rows = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
    if (!rows.length) throw new Error('Nessun dato nel foglio');

    // Load paesi_config for IT name lookup
    const paesiSnap = await getDocs(collection(this.firestore, 'paesi_config'));
    const enToIt = new Map<string, string>();
    paesiSnap.docs.forEach(d => {
      const p = d.data();
      enToIt.set((p['paese_en'] || '').toLowerCase(), p['paese_it'] || p['paese_en']);
    });

    const ops: { id: string; data: any }[] = [];
    let currentArea = '';

    for (const row of rows) {
      const areaRaw = row['Area Geografica'] || row['Area'] || '';
      if (areaRaw) currentArea = String(areaRaw).trim();

      const paeseEn = String(row['Paese'] || row['Country'] || '').trim();
      if (!paeseEn || paeseEn.toUpperCase() === 'ITALIA') continue;

      const dateRaw = row['Data Video Nic'] || row['Data'] || row['Date'];
      if (!dateRaw) continue;
      const dataVideo = dateRaw instanceof Date
        ? dateRaw.toISOString().split('T')[0]
        : String(dateRaw).trim();

      const prezzoOriginale = parseFloat(row['Prezzo nutella in valuta'] || row['Prezzo Originale'] || 0);
      const tassoCambio     = parseFloat(row['Tasso di cambio del video'] || row['Cambio'] || 1);
      const prezzoEuro      = parseFloat(row['NUTELLA IN EURO'] || row['Prezzo Euro'] || 0);
      const peso            = parseFloat(row['Quantità (g)'] || row['Peso (g)'] || row['Peso'] || 750);
      const pil             = parseFloat(row['PIL PRO CAPITE NOMINALE (€)'] || row['PIL pro capite'] || row['PIL'] || 0);
      const annoPil         = parseInt(row['Anno del dato pil'] || row['Anno PIL'] || new Date().getFullYear());

      const paeseIt = enToIt.get(paeseEn.toLowerCase()) || paeseEn;
      const euro100g = peso > 0 ? (prezzoEuro / peso) * 100 : 0;
      const min100g  = pil > 0 ? (euro100g / pil) * 2000 * 60 : 0;

      ops.push({
        id: `${this.cleanId(paeseEn)}_${dataVideo}`,
        data: {
          paese_id: this.cleanId(paeseEn),
          data_video: dataVideo, prezzo_originale: prezzoOriginale,
          tasso_cambio: tassoCambio, prezzo_euro: prezzoEuro, peso_grammi: peso,
          pil_video_eur: pil, anno_pil_video: annoPil
        }
      });
    }

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(this.firestore);
      ops.slice(i, i + 400).forEach(op => batch.set(doc(this.firestore, 'measurements', op.id), op.data));
      await batch.commit();
    }
    this.rilevazioniCache = null;
    return `${ops.length} rilevazioni importate.`;
  }

  // --- PAESI CONFIG ---

  private paesiCache: PaeseConfig[] | null = null;

  async getPaesiConfig(force = false): Promise<PaeseConfig[]> {
    if (this.paesiCache && !force) return this.paesiCache;
    const snap = await getDocs(collection(this.firestore, 'paesi_config'));
    this.paesiCache = snap.docs.map(d => ({ id: d.id, ...d.data() } as PaeseConfig));
    return this.paesiCache;
  }

  async savePaeseConfig(p: PaeseConfig): Promise<void> {
    const id = p.id || this.cleanId(p.paese_en);
    const { id: _, ...data } = p;
    await setDoc(doc(this.firestore, 'paesi_config', id), data);
    this.paesiCache = null;
  }

  async deletePaeseConfig(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'paesi_config', id));
    this.paesiCache = null;
  }

  async seedPaesiConfig(entries: PaeseConfig[]): Promise<void> {
    for (let i = 0; i < entries.length; i += 400) {
      const batch = writeBatch(this.firestore);
      entries.slice(i, i + 400).forEach(e => {
        const id = this.cleanId(e.paese_en);
        batch.set(doc(this.firestore, 'paesi_config', id), {
          paese_en: e.paese_en, paese_it: e.paese_it,
          currency: e.currency, currency_code: e.currency_code,
          exchange_rate: e.exchange_rate
        });
      });
      await batch.commit();
    }
    this.paesiCache = null;
  }

  // --- STORAGE ---

  async uploadPhoto(file: File): Promise<string> {
    const storageRef = ref(this.storage, `uploads/${Date.now()}_${file.name}`);
    const result = await uploadBytes(storageRef, file);
    return getDownloadURL(result.ref);
  }

  // --- PUBLIC SUBMISSION ---

  async submitData(data: any): Promise<void> {
    await setDoc(doc(collection(this.firestore, 'submissions')), {
      ...data, timestamp: new Date().toISOString(), status: 'pending'
    });
  }
}
