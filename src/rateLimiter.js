const { rateLimit } = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  limit: 10, // Max 10 attempts per hour (prevents brute-forcing passwords)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after an hour.'
  }
});
module.exports = {
  limiter,
  authLimiter
};