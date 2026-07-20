const express = require('express');
const movieController = require('../controllers/movieController');
const { authenticateToken } = require('../middlewares/authMiddleware'); // Auth layer
const { authorizeRoles } = require('../middlewares/roleMiddleware');     // Role layer

const router = express.Router();

// Route Chain: First verify identity, then authorize their access privilege tier
router.post('/', authenticateToken, authorizeRoles('ADMIN'), movieController.createMovie);

module.exports = router;