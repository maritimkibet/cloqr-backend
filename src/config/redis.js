const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

client.on('connect', () => {
  console.log('✅ Redis connected');
});

client.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

client.connect();

module.exports = client;
