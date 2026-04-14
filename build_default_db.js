const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const cleanId = (str) => {
  if (!str) return 'unknown';
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
};

function run() {
  const defaultDb = {
    areas: [],
    countries: [],
    measurements: []
  };

  const areasMap = new Map();
  const countriesMap = new Map();

  // Helper to add an area
  const addArea = (areaName) => {
    if (!areaName) areaName = 'Sconosciuta';
    areaName = areaName.trim();
    let areaId = cleanId(areaName);
    if (!areasMap.has(areaId)) {
      areasMap.set(areaId, { id: areaId, nome: areaName });
      defaultDb.areas.push({ id: areaId, nome: areaName });
    }
    return areaId;
  };

  // Helper to add a country
  const addCountry = (countryName, areaId) => {
    if (!countryName) return null;
    countryName = countryName.trim();
    let countryId = cleanId(countryName);
    if (!countriesMap.has(countryId)) {
      const cData = {
        id: countryId,
        nome: countryName,
        area_id: areaId || addArea('Sconosciuta'),
        pil_data: {}
      };
      countriesMap.set(countryId, cData);
      defaultDb.countries.push(cData);
    } else if (areaId && countriesMap.get(countryId).area_id === 'sconosciuta') {
      countriesMap.get(countryId).area_id = areaId;
    }
    return countryId;
  };

  // 1. Parse Nutella_Index.xlsx for Areas and Measurements
  if (fs.existsSync('doc/Nutella_Index.xlsx')) {
    const wbNutella = xlsx.readFile('doc/Nutella_Index.xlsx', { cellDates: true });
    const sheetNutella = wbNutella.Sheets[wbNutella.SheetNames[0]];
    const rowsNutella = xlsx.utils.sheet_to_json(sheetNutella);

    for (const row of rowsNutella) {
      const areaName = row['Area'] || row['area'] || row['Area Geografica'];
      const countryName = row['Paese'] || row['Country'] || row['paese'];
      const dateRaw = row['Data'] || row['Data Video Nic'] || row['Date'];

      if (!countryName) continue;

      const areaId = addArea(areaName);
      const countryId = addCountry(countryName, areaId);

      if (dateRaw) {
        let dateVal = "unknown";
        if (dateRaw instanceof Date) {
            dateVal = dateRaw.toISOString().split('T')[0];
        } else if (!isNaN(dateRaw) && dateRaw > 40000) {
            // Excel serial date
            const date = new Date((dateRaw - (25567 + 2)) * 86400 * 1000); // 2 is for 1900 leap year bug
            dateVal = date.toISOString().split('T')[0];
        } else {
            dateVal = String(dateRaw).trim();
        }

        const priceOriginal = parseFloat(row['Prezzo Originale'] || row['Prezzo nutella in valuta'] || 0);
        const exchangeRate = parseFloat(row['Cambio'] || row['Tasso Cambio'] || row['Tasso di cambio del video'] || 1);
        const priceEuro = parseFloat(row['Prezzo Euro'] || row['NUTELLA IN EURO'] || row['Euro/100g'] || 0);
        const weight = parseInt(row['Peso'] || row['Peso (g)'] || row['Quantità (g)'] || 750);
        
        // Include PIL that was used for the video specifically if we want, but we also have global pil_data.
        const pilVideo = parseFloat(row['PIL'] || row['PIL pro capite'] || row['PIL PRO CAPITE NOMINALE ($) (WBG), IMF per 2025'] || row['PIL PRO CAPITE NOMINALE (€)'] || 0);
        const annoVideo = parseInt(row['Anno PIL'] || row['Anno del dato pil'] || 2025);

        const measurementId = `${countryId}_${dateVal}`;
        defaultDb.measurements.push({
          id: measurementId,
          paese_id: countryId,
          data_video: dateVal,
          prezzo_originale: priceOriginal,
          tasso_cambio: exchangeRate,
          prezzo_euro: priceEuro,
          peso_grammi: weight,
          pil_video_eur: pilVideo, // Specific PIL recorded at time of video
          anno_pil_video: annoVideo
        });
      }
    }
  }

  // 2. Parse Elenco_Paesi_in_italiano.xlsx for canonical country list
  if (fs.existsSync('doc/Elenco_Paesi_in_italiano.xlsx')) {
    const wbPaesi = xlsx.readFile('doc/Elenco_Paesi_in_italiano.xlsx');
    const sheetPaesi = wbPaesi.Sheets['Elenco_Paesi_ITA'];
    const rowsPaesi = xlsx.utils.sheet_to_json(sheetPaesi, { header: 1 });
    
    // Format is mostly flat lists. Column 0 is Italian name.
    for (const row of rowsPaesi) {
      if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
        const cName = row[0].trim();
        if (cName.toLowerCase() !== 'afghanistan') { // Simple header check just in case, though it's actually afghanistan
            addCountry(cName);
        } else {
            addCountry(cName); // It's just the first element
        }
      }
    }
  }

  // 3. Parse Dati_PIL_in_italiano.xls for GDP
  if (fs.existsSync('doc/Dati_PIL_in_italiano.xls')) {
    const wbPil = xlsx.readFile('doc/Dati_PIL_in_italiano.xls');
    const sheetPil = wbPil.Sheets['PIL EURO In ITA'];
    if (sheetPil) {
      const rowsPil = xlsx.utils.sheet_to_json(sheetPil);
      for (const row of rowsPil) {
        const countryName = row['GDP per capita, current prices\n (U.S. dollars per capita)'];
        if (countryName) {
          const cid = cleanId(countryName);
          const cData = countriesMap.get(cid);
          if (cData) {
            // Extract years like "2020 EUR (0.85)"
            for (const key of Object.keys(row)) {
                if (key.match(/^[0-9]{4}/)) {
                    const year = key.substring(0, 4);
                    const val = row[key];
                    if (val && typeof val === 'number') {
                        cData.pil_data[year] = val;
                    }
                }
            }
          }
        }
      }
    }
  }

  // Output the default DB
  fs.writeFileSync('default_db.json', JSON.stringify(defaultDb, null, 2), 'utf-8');
  console.log(`Generated default_db.json`);
  console.log(`Areas: ${defaultDb.areas.length}`);
  console.log(`Countries: ${defaultDb.countries.length}`);
  console.log(`Measurements: ${defaultDb.measurements.length}`);
}

run();
