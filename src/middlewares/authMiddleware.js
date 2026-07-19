const jwt = require('jsonwebtoken');

/**
 * Auth Guard Middleware
 * Protects routes from unauthenticated users by verifying the incoming JWT token.
 */
const authenticateToken = (req, res, next) => {
  try {
    // 1. Extract the Authorization header
    const authHeader = req.headers['authorization'];
    
    // The header standard is: "Bearer <token_string>"
    // Split the space to extract only the second element containing the raw token
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No security token provided.' });
    }

    // 2. Cryptographically verify token signature
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
      if (err) {
        return res.status(403).json({ error: 'Session expired or token is invalid.' });
      }

      // 3. Inject decoded user info into request context for downstream routes to use
      req.user = decodedPayload;
      
      // Hand control off to the next function handler in line cleanly
      next();
    });

  } catch (error) {
    console.error('Auth Middleware Core Error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

module.exports = {
  authenticateToken
};