const axios = require('axios');

const url = 'https://api.cafci.org.ar/fondo/304/clase/308/ficha';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cafci.org.ar/',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.cafci.org.ar',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
};

(async () => {
    try {
        console.log('Fetching:', url);
        const res = await axios.get(url, { headers });
        console.log('Status:', res.status);
        console.log('Data Preview:', JSON.stringify(res.data).substring(0, 100));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data);
        }
    }
})();
