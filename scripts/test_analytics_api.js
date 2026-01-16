const axios = require('axios');
axios.get('http://localhost:3000/api/analytics')
    .then(res => {
        console.log('SUMMARY:', JSON.stringify(res.data.summary, null, 2));
        console.log('TOP ASSETS (First 3):', JSON.stringify(res.data.topAssets.slice(0, 3), null, 2));
        console.log('MARKET MIX:', JSON.stringify(res.data.marketMix, null, 2));
        console.log('MANAGER RANKING (First 3):', JSON.stringify(res.data.managerRanking.slice(0, 3), null, 2));
    })
    .catch(err => console.error('ERROR:', err.message));
