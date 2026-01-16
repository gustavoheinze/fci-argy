const https = require('https');
const fs = require('fs');

const URL = 'https://api.pub.cafci.org.ar/fondo?estado=1&include=entidad;depositaria,entidad;gerente,tipoRenta,region,benchmark,horizonte,duration,tipo_fondo,clase_fondo&limit=0&order=clase_fondos.nombre&regionId=1';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*'
};

console.log('Fetching full master list...');

const req = https.get(URL, { headers: HEADERS }, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed: ${res.statusCode}`);
        process.exit(1);
    }

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            fs.writeFileSync('cafci_master_full.json', JSON.stringify(parsed, null, 2));
            console.log(`Success! Saved to cafci_master_full.json. Total funds: ${parsed.data.length}`);

            let totalClasses = 0;
            parsed.data.forEach(f => {
                totalClasses += (f.clase_fondos ? f.clase_fondos.length : 0);
            });
            console.log(`Total classes (expected database records): ${totalClasses}`);

        } catch (e) {
            console.error('Parse error:', e.message);
            fs.writeFileSync('cafci_master_raw_error.txt', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
});
