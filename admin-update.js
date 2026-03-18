const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, getDocs, deleteDoc } = require('firebase/firestore');
const xlsx = require('xlsx');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyDzsWnugHNQOl7Kv7FqhPQRx2tkm7D1Bko",
  authDomain: "lgrdg-a4a32.firebaseapp.com",
  projectId: "lgrdg-a4a32"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Clearing old collections...');
  const batch1 = writeBatch(db);
  const areasSnap = await getDocs(collection(db, 'areas'));
  areasSnap.forEach(d => batch1.delete(d.ref));
  const countriesSnap = await getDocs(collection(db, 'countries'));
  countriesSnap.forEach(d => batch1.delete(d.ref));
  const measurementsSnap = await getDocs(collection(db, 'measurements'));
  measurementsSnap.forEach(d => batch1.delete(d.ref));
  await batch1.commit();
  console.log('Cleared.');

  console.log('Reading excel...');
  const fileP = path.join(__dirname, 'doc', 'Nutella_Index.xlsx');
  const wb = xlsx.readFile(fileP, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const batch = writeBatch(db);
  const areasMap = new Map();
  const countriesMap = new Map();
  let opCount = 0;

  const cleanId = (str) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

  for (const row of rows) {
    const areaName = (row['Area'] || row['area'] || row['Area Geografica'] || 'Unknown').trim();
    const countryName = (row['Paese'] || row['Country'] || row['paese']).trim();
    const dateRaw = row['Data'] || row['Data Video Nic'] || row['Date'];

    if (!countryName || !dateRaw) continue;

    const dateVal = dateRaw instanceof Date ? dateRaw.toISOString().split('T')[0] : String(dateRaw).trim();

    const priceOriginal = parseFloat(row['Prezzo Originale'] || row['Prezzo nutella in valuta'] || 0);
    const exchangeRate = parseFloat(row['Cambio'] || row['Tasso Cambio'] || row['Tasso di cambio del video'] || 1);
    const priceEuro = parseFloat(row['Prezzo Euro'] || row['NUTELLA IN EURO'] || row['Euro/100g'] || 0);
    const weight = parseInt(row['Peso'] || row['Peso (g)'] || row['Quantità (g)'] || 750);
    const gdpPerCapita = parseFloat(row['PIL'] || row['PIL pro capite'] || row['PIL PRO CAPITE NOMINALE ($) (WBG), IMF per 2025'] || row['PIL PRO CAPITE NOMINALE (€)'] || 0);
    const gdpYear = parseInt(row['Anno PIL'] || row['Anno del dato pil'] || 2025);

    let areaId = areasMap.get(areaName);
    if (!areaId) {
      areaId = cleanId(areaName);
      if (!areasMap.has(areaName)) {
        batch.set(doc(db, 'areas', areaId), { nome: areaName });
        areasMap.set(areaName, areaId);
        opCount++;
      }
    }

    let countryId = countriesMap.get(countryName);
    if (!countryId) {
      countryId = cleanId(countryName);
      if (!countriesMap.has(countryName)) {
        batch.set(doc(db, 'countries', countryId), {
          nome: countryName,
          area_id: areaId
        });
        countriesMap.set(countryName, countryId);
        opCount++;
      }
    }

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

    batch.set(doc(db, 'measurements', measurementId), measurementData);
    opCount++;
  }

  console.log(`Committing ${opCount} records...`);
  await batch.commit();
  console.log('Done!');
  process.exit(0);
}
run().catch(console.error);
