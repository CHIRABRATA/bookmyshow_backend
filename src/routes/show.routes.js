const express = require('express');
const showController = require('../controllers/showController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const seatModel = require('../models/seatModel');
const redisClient = require("../config/redis");

const router = express.Router();

// Guarded Action: Only Admin accounts can create new scheduling blocks
router.post('/', authenticateToken, authorizeRoles('ADMIN'), showController.scheduleShow);
// Public Route: Fetch seating arrangement with Redis caching optimization
router.get('/:id/seats', async (req, res) => {
  try {
    const showId = req.params.id;
    const cacheKey = `show:${showId}:seats`;

    // 2. Try fetching from Redis first
    const cachedSeats = await redisClient.get(cacheKey);
    if (cachedSeats) {
      // Cache Hit! Parse and return immediately
      return res.status(200).json(JSON.parse(cachedSeats));
    }

    // 3. Cache Miss: Fetch from PostgreSQL database
    const seats = await seatModel.getSeatsByShow(showId);
    const responsePayload = { count: seats.length, seats };

    // 4. Store the result in Redis with an expiration window (e.g., 300 seconds = 5 minutes)
    await redisClient.setEx(cacheKey, 300, JSON.stringify(responsePayload));

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error("Get Seats Error:", error);
    res.status(500).json({ error: "Internal server error fetching layout matrix." });
  }
});


module.exports = router;