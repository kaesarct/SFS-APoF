const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const fileP = path.join(__dirname, 'doc', 'Nutella_Index.xlsx');
const wb = xlsx.readFile(fileP);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet).slice(0, 5);

console.log(JSON.stringify(data, null, 2));
