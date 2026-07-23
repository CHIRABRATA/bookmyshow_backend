const db = require('../config/db');

const bookSeats = async (req, res) => {
  const client = await db.connect();
  
  try {
    const { showId, seatIds } = req.body; // Notice: We don't trust totalAmount from the body anymore!
    const userId = req.user.id;

    if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // 1. Open the ACID transaction block
    await client.query('BEGIN');

    // 2. CONCURRENCY SHIELD: Lock the requested rows instantly
    const placeholders = seatIds.map((_, index) => `$${index + 2}`).join(', ');
    const lockSeatsQuery = `
      SELECT id, status, seat_tier, tier_price_addition FROM seats 
      WHERE show_id = $1 AND id IN (${placeholders}) 
      FOR UPDATE;
    `;
    const lockResult = await client.query(lockSeatsQuery, [showId, ...seatIds]);

    // 3. Verify availability state inside the lock scope
    const areAllAvailable = lockResult.rows.every(seat => seat.status === 'AVAILABLE');
    if (!areAllAvailable || lockResult.rows.length !== seatIds.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "One or more selected seats have already been claimed!" });
    }

    // 4. Fetch the show's base ticket price
    const showRes = await client.query('SELECT ticket_price FROM shows WHERE id = $1', [showId]);
    if (showRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Showtime record not found." });
    }
    const basePrice = parseFloat(showRes.rows[0].ticket_price);

    // 5. SERVER-SIDE CALCULATION: Sum up the base price + unique tier additions for each seat
    let calculatedTotal = 0;
    lockResult.rows.forEach(seat => {
      const extraCharge = parseFloat(seat.tier_price_addition) || 0;
      calculatedTotal += (basePrice + extraCharge);
    });

    // 6. Update the seat states to BOOKED
    const updateSeatsQuery = `
      UPDATE seats SET status = 'BOOKED' 
      WHERE show_id = $1 AND id IN (${placeholders});
    `;
    await client.query(updateSeatsQuery, [showId, ...seatIds]);

    // 7. Generate the invoice using the calculated price
    const insertBookingQuery = `
      INSERT INTO bookings (user_id, show_id, total_amount, status)
      VALUES ($1, $2, $3, 'CONFIRMED')
      RETURNING id;
    `;
    const bookingResult = await client.query(insertBookingQuery, [userId, showId, calculatedTotal]);
    const bookingId = bookingResult.rows[0].id;

    // 8. Link the seats to the final booking record
    for (let seatId of seatIds) {
      await client.query(
        `INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2);`,
        [bookingId, seatId]
      );
    }

    // 9. Commit changes safely
    await client.query('COMMIT');

    res.status(201).json({
      message: "Success! Booking processed safely.",
      bookingId,
      finalAmountCharged: calculatedTotal // Send the true computed total back to the user
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("ACID Booking Transaction Crash:", error);
    res.status(500).json({ error: "Internal server error processing seat purchase." });
  } finally {
    client.release();
  }
};

module.exports = { bookSeats };