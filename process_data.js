const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1. Read Countries
const countriesPath = path.join(__dirname, 'doc', 'Elenco_Paesi.xlsx');
const countriesWb = xlsx.readFile(countriesPath);
const countriesSheet = countriesWb.Sheets[countriesWb.SheetNames[0]];
const countriesData = xlsx.utils.sheet_to_json(countriesSheet, { header: 1 });

// Assuming the first column has the country names (skipping header if any)
const countriesList = countriesData.map(row => row[0]).filter(c => typeof c === 'string' && c.trim() !== '' && c.toLowerCase() !== 'paese').map(c => c.trim());

// 2. Read GDP
const gdpPath = path.join(__dirname, 'doc', 'Dati_PIL.xls');
const gdpWb = xlsx.readFile(gdpPath);
// Use the second sheet "Dati PIL Euro"
const sheetName = gdpWb.SheetNames[1] || gdpWb.SheetNames[0];
const gdpSheet = gdpWb.Sheets[sheetName];
const gdpData = xlsx.utils.sheet_to_json(gdpSheet);

// Reformat GDP Data
const gdpDict = {};
gdpData.forEach(row => {
    // Assuming the country name is in the first column or 'Country' or 'Paese'
    let countryKey = Object.keys(row).find(k => k.toLowerCase().includes('paese') || k.toLowerCase().includes('country'));
    if (!countryKey) {
        countryKey = Object.keys(row)[0];
    }
    const countryName = row[countryKey];
    if (countryName) {
        let yearsData = {};
        Object.keys(row).forEach(k => {
            if (!isNaN(parseInt(k))) {
                yearsData[k] = row[k];
            }
        });
        gdpDict[countryName.trim()] = yearsData;
    }
});

const outputPath = path.join(__dirname, 'src', 'app', 'nutella-data.json');
fs.writeFileSync(outputPath, JSON.stringify({
    countries: countriesList,
    gdp: gdpDict
}, null, 2));

console.log('Successfully written to ' + outputPath);
