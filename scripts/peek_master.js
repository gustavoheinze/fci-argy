
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('cafci_master_full.json', 'utf8')).data;
const sample = data[0];
console.log(JSON.stringify(sample, null, 2));
