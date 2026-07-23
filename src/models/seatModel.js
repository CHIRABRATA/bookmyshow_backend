const db = require('../config/db');

/**
 * Dynamically generates a custom seat matrix based on the specific theater's capacity
 */
const generateSeatsForShow = async (showId, theaterId) => {
  // 1. Look up the physical capacity configuration of the target theater hall
  const theaterRes = await db.query('SELECT total_seats FROM theaters WHERE id = $1', [theaterId]);
  if (theaterRes.rows.length === 0) throw new Error("Theater location not found.");
  
  const totalSeats = theaterRes.rows[0].total_seats; // e.g., 50, 100, 150
  
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const seatValues = [];
  const queryParams = [];
  let paramIndex = 1;

  // 2. Calculate row layout dynamically (10 seats per row)
  const seatsPerRow = 10;
  
  for (let i = 0; i < totalSeats; i++) {
    const rowIndex = Math.floor(i / seatsPerRow);
    const seatNum = (i % seatsPerRow) + 1;
    
    // Safety fallback: if a theater is massive and runs out of alphabet rows
    const rowLabel = rows[rowIndex] || `Z${rowIndex}`; 
    const seatLabel = `${rowLabel}${seatNum}`; // e.g., 'A1', 'B5'

    seatValues.push(`($${paramIndex}, $${paramIndex + 1})`);
    queryParams.push(showId, seatLabel);
    paramIndex += 2;
  }

  const query = `
    INSERT INTO seats (show_id, seat_number) 
    VALUES ${seatValues.join(', ')}
    ON CONFLICT DO NOTHING;
  `;
  
  await db.query(query, queryParams);
};