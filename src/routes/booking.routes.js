const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Both ADMIN and ATTENDEE profiles can buy tickets, but they must be logged in
router.post('/', authenticateToken, bookingController.bookSeats);

module.exports = router;