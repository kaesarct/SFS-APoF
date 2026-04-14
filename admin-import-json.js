const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
  apiKey: "AIzaSyDzsWnugHNQOl7Kv7FqhPQRx2tkm7D1Bko",
  authDomain: "lgrdg-a4a32.firebaseapp.com",
  projectId: "lgrdg-a4a32"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Reading default_db.json...');
  const dataRaw = fs.readFileSync('default_db.json', 'utf-8');
  const dbData = JSON.parse(dataRaw);

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

  let opCount = 0;
  let batch = writeBatch(db);
  
  const commitBatch = async () => {
      await batch.commit();
      batch = writeBatch(db);
  };

  // 1. Write Areas
  console.log('Writing Areas...');
  for (const area of dbData.areas) {
    batch.set(doc(db, 'areas', area.id), { nome: area.nome });
    opCount++;
  }

  // 2. Write Countries
  console.log('Writing Countries...');
  for (const country of dbData.countries) {
    batch.set(doc(db, 'countries', country.id), {
      nome: country.nome,
      area_id: country.area_id,
      pil_data: country.pil_data || {}
    });
    opCount++;
    if (opCount % 400 === 0) await commitBatch();
  }

  // 3. Write Measurements (Recovered Nutella indexes)
  console.log('Writing Measurements...');
  for (const ms of dbData.measurements) {
    const docId = ms.id;
    delete ms.id; // remove id from data
    batch.set(doc(db, 'measurements', docId), ms);
    opCount++;
    if (opCount % 400 === 0) await commitBatch();
  }

  console.log(`Committing remaining ${opCount} total records...`);
  await commitBatch();
  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
