const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route 1: Initial Selection Lock (Fires Stage 1: PENDING checkout state setup)
router.post('/', authenticateToken, bookingController.lockSeatsForCheckout);

// Route 2: Payment Execution Simulation (Fires Stage 2: CONFIRMED vs FAILED evaluation)
router.post('/process-payment', authenticateToken, bookingController.processPaymentMock);
// Route 3: Public/User Route: Fetch complete relational breakdown of a specific booking invoice
router.get('/:id', authenticateToken, async (req, res) => {
  const db = require('../config/db');
  try {
    const bookingId = req.params.id;
    const userId = req.user.id; // Extracted safely from auth token middleware

    // RELATIONAL ENGINE: Join bookings -> shows -> movies -> theaters
    const bookingQuery = `
      SELECT 
        b.id AS booking_id,
        b.total_amount,
        b.status AS booking_status,
        b.created_at,
        s.show_time,
        m.title AS movie_title,
        m.genre AS movie_genre,
        t.name AS theater_name,
        t.location AS theater_location
      FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN theaters t ON s.theater_id = t.id
      WHERE b.id = $1 AND b.user_id = $2;
    `;

    const bookingRes = await db.query(bookingQuery, [bookingId, userId]);

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Ticket breakdown receipt not found or access denied." });
    }

    // Sub-Query: Fetch all text seat labels (e.g., A3, A4) linked to this specific transaction
    const seatsQuery = `
      SELECT s.seat_number, s.seat_tier 
      FROM booking_seats bs
      JOIN seats s ON bs.seat_id = s.id
      WHERE bs.booking_id = $1;
    `;
    const seatsRes = await db.query(seatsQuery, [bookingId]);

    // Stitch the data fields into a polished summary packet
    const receipt = {
      ...bookingRes.rows[0],
      booked_seats: seatsRes.rows.map(row => `${row.seat_tier}: ${row.seat_number}`)
    };

    res.status(200).json({ success: true, receipt });

  } catch (error) {
    console.error("Fetch Ticket Summary Crash:", error);
    res.status(500).json({ error: "Internal server error assembling summary dashboard mapping." });
  }
});

module.exports = router;