
const { getAllFondos } = require('../lib/sqlite');

async function findFund() {
    try {
        const funds = await getAllFondos();
        const fund = funds.find(f => f.nombre.includes('Allaria Agro') && f.nombre.includes('Clase A'));

        if (fund) {
            console.log('--- FUND DATA FOUND ---');
            console.log(JSON.stringify(fund, null, 2));
        } else {
            console.log('Fund not found. Closest matches:');
            const matches = funds.filter(f => f.nombre.includes('Allaria Agro')).map(f => f.nombre);
            console.log(matches);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

findFund();
