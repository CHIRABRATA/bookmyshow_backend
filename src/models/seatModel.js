const db = require('../config/db');

/**
 * Dynamically generates 100 empty seats (Rows A-J, Numbers 1-10) for a new show
 */
const generateSeatsForShow = async (showId) => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatValues = [];
  let paramIndex = 1;
  const queryParams = [];

  // Build a safe parameterized multi-row insert array
  for (let row of rows) {
    for (let i = 1; i <= 10; i++) {
      seatValues.push(`($${paramIndex}, $${paramIndex + 1})`);
      queryParams.push(showId, `${row}${i}`);
      paramIndex += 2;
    }
  }

  const query = `
    INSERT INTO seats (show_id, seat_number) 
    VALUES ${seatValues.join(', ')}
    ON CONFLICT DO NOTHING;
  `;
  
  await db.query(query, queryParams);
};

/**
 * Fetches the current real-time seating arrangement grid for a specific show
 */
const getSeatsByShow = async (showId) => {
  const query = `
    SELECT id, seat_number, status 
    FROM seats 
    WHERE show_id = $1 
    ORDER BY length(seat_number) ASC, seat_number ASC;
  `;
  const result = await db.query(query, [showId]);
  return result.rows;
};

module.exports = {
  generateSeatsForShow,
  getSeatsByShow
};