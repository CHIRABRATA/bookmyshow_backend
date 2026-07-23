const db = require('../config/db');
const redisClient = require('../config/redis');

/**
 * Stage 1: Lock seats temporarily for 10 minutes and create a PENDING booking
 */
const lockSeatsForCheckout = async (req, res) => {
  const client = await db.connect();
  try {
    const { showId, seatIds } = req.body;
    const userId = req.user.id;

    if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: "Missing required booking selection fields." });
    }

    await client.query('BEGIN');

    // CONCURRENCY SHIELD: Select rows and apply exclusive update locks
    const placeholders = seatIds.map((_, index) => `$${index + 2}`).join(', ');
    const lockSeatsQuery = `
      SELECT id, status, tier_price_addition, locked_until FROM seats 
      WHERE show_id = $1 AND id IN (${placeholders}) 
      FOR UPDATE;
    `;
    const lockResult = await client.query(lockSeatsQuery, [showId, ...seatIds]);

    if (lockResult.rows.length !== seatIds.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "One or more target seats could not be found." });
    }

    // Dynamic Availability Check: Valid if status is AVAILABLE OR the previous lock timer has completely expired
    const allValid = lockResult.rows.every(seat => {
      const isAvailable = seat.status === 'AVAILABLE';
      const isLockExpired = seat.status === 'LOCKED' && seat.locked_until && new Date(seat.locked_until) < new Date();
      return isAvailable || isLockExpired;
    });

    if (!allValid) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "Selection clash! One or more seats are actively held by another user." });
    }

    // Calculate base ticket costs
    const showRes = await client.query('SELECT ticket_price FROM shows WHERE id = $1', [showId]);
    if (showRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Showtime record missing." });
    }
    const basePrice = parseFloat(showRes.rows[0].ticket_price);

    let totalCalculatedAmount = 0;
    lockResult.rows.forEach(seat => {
      totalCalculatedAmount += (basePrice + parseFloat(seat.tier_price_addition));
    });

    // Advance lock expiration window exactly 10 minutes into the future
    const lockExpiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
// --- UPDATE THIS BLOCK INSIDE lockSeatsForCheckout ---

    // Generate fresh placeholders that start exactly at $3 since $1 is expiry and $2 is showId
    const updatePlaceholders = seatIds.map((_, index) => `$${index + 3}`).join(', ');
    
    const updateSeatsQuery = `
      UPDATE seats 
      SET status = 'LOCKED', locked_until = $1 
      WHERE show_id = $2 AND id IN (${updatePlaceholders});
    `;
    
    // Values array maps: $1 = lockExpiryTime, $2 = showId, $3 = seatIds[0], $4 = seatIds[1]...
    await client.query(updateSeatsQuery, [lockExpiryTime, showId, ...seatIds]);

    // Insert master booking container initialized as PENDING invoice state
    const insertBookingQuery = `
      INSERT INTO bookings (user_id, show_id, total_amount, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id;
    `;
    const bookingRes = await client.query(insertBookingQuery, [userId, showId, totalCalculatedAmount]);
    const bookingId = bookingRes.rows[0].id;

    for (let seatId of seatIds) {
      await client.query(`INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2);`, [bookingId, seatId]);
    }

    // Invalidate cache right before committing the database changes
    await redisClient.del(`show:${showId}:seats`);
    await client.query('COMMIT');
    res.status(201).json({
      message: "Seats locked successfully for 10 minutes. Proceed to payment callback window.",
      bookingId,
      amountDue: totalCalculatedAmount,
      lockedUntil: lockExpiryTime
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Lock Transaction Error:", error);
    res.status(500).json({ error: "Internal server error establishing session lock." });
  } finally {
    client.release();
  }
};

/**
 * Stage 2: Process the final mock payment gateway callback status
 */
const processPaymentMock = async (req, res) => {
  const client = await db.connect();
  try {
    const { bookingId, paymentSuccess } = req.body; // paymentSuccess boolean flag: true or false

    if (!bookingId || paymentSuccess === undefined) {
      return res.status(400).json({ error: "Missing transaction confirmation flags." });
    }

    await client.query('BEGIN');

    // Fetch booking details and apply lock row shield protection
    const bookingRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE;', [bookingId]);
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Invoice registry record not found." });
    }
    
    const booking = bookingRes.rows[0];
    if (booking.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "This booking checkout process has already been finalized." });
    }

    // Fetch all related seat IDs linked to this booking invoice sequence
    const seatsRes = await client.query('SELECT seat_id FROM booking_seats WHERE booking_id = $1', [bookingId]);
    const seatIds = seatsRes.rows.map(row => row.seat_id);
    const placeholders = seatIds.map((_, i) => `$${i + 1}`).join(', ');

    if (paymentSuccess === true) {
      // SUCCESSFUL PAYMENT FLOW: Convert seat statuses to permanent BOOKED states and wipe out temporary time locks
      await client.query(`UPDATE seats SET status = 'BOOKED', locked_until = NULL WHERE id IN (${placeholders});`, seatIds);
      await client.query(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1;`, [bookingId]);

      // Invalidate cache right before committing the database changes
      await redisClient.del(`show:${booking.show_id}:seats`);
      await client.query('COMMIT');
      return res.status(200).json({ message: "Payment verified successfully! Ticket confirmed.", status: "CONFIRMED" });
    } else {
      // FAILED/CANCELLED PAYMENT FLOW: Release seats back immediately to AVAILABLE status and clear metrics
      await client.query(`UPDATE seats SET status = 'AVAILABLE', locked_until = NULL WHERE id IN (${placeholders});`, seatIds);
      await client.query(`UPDATE bookings SET status = 'FAILED' WHERE id = $1;`, [bookingId]);

      // Invalidate cache right before committing the database changes
      await redisClient.del(`show:${booking.show_id}:seats`);
      await client.query('COMMIT');
      return res.status(200).json({ message: "Payment failed or cancelled. Seats released back to public availability pools.", status: "FAILED" });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Payment Processing Error:", error);
    res.status(500).json({ error: "Internal runtime crash mapping payment context state." });
  } finally {
    client.release();
  }
};

module.exports = {
  lockSeatsForCheckout,
  processPaymentMock
};