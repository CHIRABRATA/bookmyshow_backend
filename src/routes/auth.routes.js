const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.registerUser);
//login route
router.post('/login', authController.loginUser);
// Example of a protected route that requires authentication
router.get('/profile', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Welcome to your private profile dashboard! Security pass verified.',
    user: req.user
  });
});
module.exports = router;