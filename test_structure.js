const fs = require('fs');

async function testDataStructure() {
    try {
        const response = await fetch('http://localhost:3000/api/funds');
        const funds = await response.json();

        console.log(`Total funds: ${funds.length}`);

        const fundWithComp = funds.find(f => f.composicion && f.composicion.length > 0);

        if (fundWithComp) {
            console.log('\nFound fund with composition:');
            console.log('Fund name:', fundWithComp.nombre);
            console.log('Composition items:', fundWithComp.composicion.length);
            console.log('\nFirst composition item:');
            console.log(JSON.stringify(fundWithComp.composicion[0], null, 2));

            // Check if fields exist
            const firstItem = fundWithComp.composicion[0];
            console.log('\nField check:');
            console.log('- has "activo":', 'activo' in firstItem);
            console.log('- has "porcentaje":', 'porcentaje' in firstItem);
            console.log('- has "nombreActivo":', 'nombreActivo' in firstItem);
            console.log('- has "share":', 'share' in firstItem);
        } else {
            console.log('\nNo funds with composition found!');
            console.log('Sample fund keys:', Object.keys(funds[0]));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testDataStructure();
