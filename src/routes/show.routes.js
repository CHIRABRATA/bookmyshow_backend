const express = require('express');
const showController = require('../controllers/showController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const seatModel = require('../models/seatModel');

const router = express.Router();

// Guarded Action: Only Admin accounts can create new scheduling blocks
router.post('/', authenticateToken, authorizeRoles('ADMIN'), showController.scheduleShow);
router.get('/:id/seats', async (req, res) => {
  try {
    // FIX: Changed from getSeatsByShowId to getSeatsByShow
    const seats = await seatModel.getSeatsByShow(req.params.id);
    res.status(200).json({ count: seats.length, seats });
  } catch (error) {
    console.error("Get Seats Error:", error);
    res.status(500).json({ error: "Internal server error fetching layout matrix." });
  }
});


module.exports = router;