const https = require('https');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*'
};

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse JSON'));
                    }
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('Fetching master list...');
        const listUrl = 'https://api.pub.cafci.org.ar/fondo?limit=1&include=entidad;depositaria,entidad;gerente,tipoRenta,region,benchmark,horizonte,duration,tipo_fondo,clase_fondo';
        const listData = await fetchUrl(listUrl);

        if (!listData.data || listData.data.length === 0) {
            console.log('No funds found.');
            return;
        }

        const firstFund = listData.data[0];
        const firstClass = firstFund.clase_fondos[0];

        console.log(`Fetching detail for Fund ${firstFund.id}, Class ${firstClass.id}...`);

        const detailUrl = `https://api.pub.cafci.org.ar/fondo/${firstFund.id}/clase/${firstClass.id}/ficha`;
        const detailData = await fetchUrl(detailUrl);

        const output = { master: firstFund, detail: detailData.data };
        require('fs').writeFileSync('cafci_dump_utf8.json', JSON.stringify(output, null, 2), 'utf8');
        console.log('files written to cafci_dump_utf8.json');

    } catch (err) {
        console.error(err);
    }
}

run();
