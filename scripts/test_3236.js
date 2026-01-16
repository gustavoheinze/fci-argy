const https = require('https');

const fund_id = '1129'; // Found by looking up ID 3236 in master
const class_id = '3236';
const url = `https://api.pub.cafci.org.ar/fondo/${fund_id}/clase/${class_id}/ficha`;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Origin': 'https://www.cafci.org.ar',
    'Accept': 'application/json, text/plain, */*',
};

https.get(url, { headers: HEADERS }, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Response Length:', data.length);
        console.log('Response:', data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
