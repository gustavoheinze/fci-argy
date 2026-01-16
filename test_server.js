require('dotenv').config({ path: '.env.local' });
const express = require('express');
const { getAllFondos } = require('./lib/redis');

const app = express();

app.get('/api/funds', async (req, res) => {
    try {
        console.log('Fetching funds from Redis...');
        const funds = await getAllFondos();
        console.log('Funds retrieved:', Array.isArray(funds), 'Length:', funds.length);
        res.json(funds);
    } catch (error) {
        console.error('API_ERROR:', error);
        res.status(500).json({ error: 'Error processing funds request', details: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log('Try: curl http://localhost:3001/api/funds');
});
