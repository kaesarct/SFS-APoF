const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const fileP = path.join(__dirname, 'doc', 'Fasce_prezzo.xlsx');
const wb = xlsx.readFile(fileP);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

console.log(JSON.stringify(data, null, 2));
