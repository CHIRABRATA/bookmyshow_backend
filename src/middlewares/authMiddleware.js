const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // 1. Extract the token directly out of the secure cookies collection container
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No security session found.' });
    }

    // 2. Cryptographically verify the cookie token
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
      if (err) {
        return res.status(403).json({ error: 'Session expired or invalid.' });
      }

      req.user = decodedPayload;
      next();
    });
  } catch (error) {
    console.error('Auth Cookie Middleware Error:', error);
    res.status(500).json({ error: 'Internal server error during session scan.' });
  }
};

module.exports = {
  authenticateToken
};