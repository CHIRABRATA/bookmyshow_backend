const { createClient } = require('redis');

const normalizeRedisUrl = (value) => {
  if (!value || typeof value !== 'string') return 'redis://localhost:6379';

  const trimmedValue = value.trim();
  if (!trimmedValue) return 'redis://localhost:6379';

  const urlMatch = trimmedValue.match(/redis(?:s)?:\/\/[^\s"']+/i);
  if (urlMatch) {
    return urlMatch[0];
  }

  return trimmedValue;
};

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);

// Initialize the Redis client using your environment configurations
const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('⚡ Connected to Redis Cache Shield successfully.'));

// Self-invoking connection function
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection failed:', error.message);
  }
})();

module.exports = redisClient;