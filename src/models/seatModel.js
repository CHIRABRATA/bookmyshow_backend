const db = require('../config/db');

const generateSeatsForShow = async (showId, theaterId) => {
  const theaterRes = await db.query('SELECT total_seats FROM theaters WHERE id = $1', [theaterId]);
  if (theaterRes.rows.length === 0) throw new Error("Theater location not found.");
  
  const totalSeats = theaterRes.rows[0].total_seats;
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const seatValues = [];
  const queryParams = [];
  let paramIndex = 1;
  const seatsPerRow = 10;
  
  for (let i = 0; i < totalSeats; i++) {
    const rowIndex = Math.floor(i / seatsPerRow);
    const seatNum = (i % seatsPerRow) + 1;
    const rowLabel = rows[rowIndex] || `Z${rowIndex}`;
    const seatLabel = `${rowLabel}${seatNum}`;

    // TIER PRICING CONFIGURATION LOGIC
    let tier = 'NORMAL';
    let extraPrice = 0.00;

    if (rowLabel === 'A' || rowLabel === 'B') {
      tier = 'VIP';
      extraPrice = 150.00; // Adds ₹150 extra for recliners
    } else if (rowLabel === 'C' || rowLabel === 'D' || rowLabel === 'E') {
      tier = 'PREMIUM';
      extraPrice = 50.00;  // Adds ₹50 extra for middle rows
    }

    // Pass show_id, seat_number, seat_tier, tier_price_addition
    seatValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
    queryParams.push(showId, seatLabel, tier, extraPrice);
    paramIndex += 4;
  }

  const query = `
    INSERT INTO seats (show_id, seat_number, seat_tier, tier_price_addition) 
    VALUES ${seatValues.join(', ')}
    ON CONFLICT DO NOTHING;
  `;
  
  await db.query(query, queryParams);
};

const getSeatsByShow = async (showId) => {
  const query = `
    SELECT id, seat_number, status, seat_tier, tier_price_addition 
    FROM seats 
    WHERE show_id = $1 
    ORDER BY length(seat_number) ASC, seat_number ASC;
  `;
  const result = await db.query(query, [showId]);
  return result.rows;
};

module.exports = { generateSeatsForShow, getSeatsByShow };