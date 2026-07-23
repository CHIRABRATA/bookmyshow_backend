const cron = require('node-cron');
const db = require('../config/db');           // Go up to src, then into config/db
const redisClient = require('../config/redis');

const isTransientDbError = (error) => {
  return error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('terminated unexpectedly');
};

// Run this script automatically every single minute (* * * * *)
cron.schedule('* * * * *', async () => {
  let client;

  try {
    client = await db.connect();
    await client.query('BEGIN');

    // 1. Find all bookings that have been stuck in PENDING status past their lock windows
    const findExpiredBookingsQuery = `
      SELECT b.id FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN booking_seats bs ON b.id = bs.booking_id
      JOIN seats se ON bs.seat_id = se.id
      WHERE b.status = 'PENDING' AND se.status = 'LOCKED' AND se.locked_until < NOW()
      GROUP BY b.id;
    `;
    const expiredRes = await client.query(findExpiredBookingsQuery);

    if (expiredRes.rows.length > 0) {
      const expiredBookingIds = expiredRes.rows.map(row => row.id);
      const placeholders = expiredBookingIds.map((_, i) => `$${i + 1}`).join(', ');

      // 2. Flip the booking statuses to FAILED
      await client.query(`UPDATE bookings SET status = 'FAILED' WHERE id IN (${placeholders});`, expiredBookingIds);
      console.log(`🧹 Cron Worker: Marked ${expiredBookingIds.length} abandoned bookings as FAILED.`);
    }

    // 3. Release ALL seats across the entire system whose lock timer has run out
    const releaseSeatsQuery = `
      UPDATE seats 
      SET status = 'AVAILABLE', locked_until = NULL 
      WHERE status = 'LOCKED' AND locked_until < NOW()
      RETURNING show_id;
    `;
    const seatRes = await client.query(releaseSeatsQuery);

    if (seatRes.rows.length > 0) {
      console.log(`🔓 Cron Worker: Successfully released ${seatRes.rows.length} expired seat locks back to the public pool.`);

      // 4. Invalidate Redis cache for any show that had seats released so users see them instantly!
      const uniqueShowIds = [...new Set(seatRes.rows.map(row => row.show_id))];
      for (let showId of uniqueShowIds) {
        await redisClient.del(`show:${showId}:seats`);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('❌ Background Cron Cleanup Worker rollback failed:', rollbackError);
      }
    }

    if (isTransientDbError(error)) {
      console.warn('⚠️ Background Cron Cleanup Worker skipped due to transient database error:', error.message);
    } else {
      console.error('❌ Background Cron Cleanup Worker Error:', error);
    }
  } finally {
    if (client) {
      client.release();
    }
  }
});

console.log('⏰ Automated Seat Release Cron Job initialized and monitoring every 60 seconds.');