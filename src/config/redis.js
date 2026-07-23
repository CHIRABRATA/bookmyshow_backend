const { createClient } = require('redis');

const noopRedisClient = {
  async connect() {
    return null;
  },
  async quit() {
    return null;
  },
  async set() {
    return 'OK';
  },
  async get() {
    return null;
  },
  async del() {
    return 0;
  },
  async exists() {
    return 0;
  },
  async expire() {
    return 0;
  },
  on() {
    return this;
  }
};

const normalizeRedisUrl = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const urlMatch = trimmedValue.match(/redis(?:s)?:\/\/[^\s"']+/i);
  if (urlMatch) {
    return urlMatch[0];
  }

  return trimmedValue;
};

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);

let redisClient = noopRedisClient;

if (redisUrl) {
  redisClient = createClient({ url: redisUrl });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('⚡ Connected to Redis Cache Shield successfully.'));

  (async () => {
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis connection unavailable; continuing without cache:', error.message);
      redisClient = noopRedisClient;
    }
  })();
} else {
  console.warn('Redis is not configured; continuing without cache for this deployment.');
}

module.exports = redisClient;