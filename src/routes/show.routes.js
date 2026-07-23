const express = require('express');
const showController = require('../controllers/showController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Guarded Action: Only Admin accounts can create new scheduling blocks
router.post('/', authenticateToken, authorizeRoles('ADMIN'), showController.scheduleShow);

module.exports = router;