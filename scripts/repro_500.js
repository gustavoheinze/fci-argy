
require('dotenv').config();
const { getFondos } = require('../lib/sqlite');

async function test() {
    console.log('Testing getFondos()...');
    try {
        const results = await getFondos();
        console.log('Success! Count:', results.length);
    } catch (err) {
        console.error('CRASHED:', err);
        console.error('Stack:', err.stack);
    }
}

test();
