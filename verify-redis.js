require('dotenv').config({ path: '.env.local' });
const { Redis } = require('@upstash/redis');

console.log('URL:', process.env.UPSTASH_REDIS_REST_URL);
console.log('Token Length:', process.env.UPSTASH_REDIS_REST_TOKEN ? process.env.UPSTASH_REDIS_REST_TOKEN.length : 'N/A');

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

(async () => {
    try {
        console.log('Pinging Redis...');
        const pong = await redis.ping();
        console.log('Response:', pong);
    } catch (error) {
        console.error('Redis Error:', error.message);
    }
})();
