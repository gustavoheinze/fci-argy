const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('current_data.json', 'utf8'));
    const fundWithComp = data.find(f => f.composicion && f.composicion.length > 0);

    if (fundWithComp) {
        console.log('Found fund with composition:', fundWithComp.nombre);
        const output = JSON.stringify(fundWithComp.composicion[0], null, 2);
        console.log('Writing to file...');
        fs.writeFileSync('inspect_result.txt', output);
    } else {
        console.log('No funds with composition found.');
    }
} catch (e) {
    console.error(e);
}
