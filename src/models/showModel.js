const db = require('../config/db');

/**
 * Checks if a specific theater hall is already occupied during a target timeframe.
 * @param {string} theaterId - The UUID of the theater screen
 * @param {string} showTime - ISO Timestamp of the proposed showtime
 * @param {number} durationMinutes - The length of the movie in minutes
 */
const checkConflict = async (theaterId, showTime, durationMinutes) => {
  const query = `
    SELECT id FROM shows 
    WHERE theater_id = $1 
    AND show_time <= ($2::timestamp + ($3 || ' minutes')::interval)
    AND ($2::timestamp <= show_time + (SELECT duration FROM movies WHERE id = shows.movie_id) * interval '1 minute');
  `;
  const result = await db.query(query, [theaterId, showTime, durationMinutes]);
  return result.rows.length > 0; // Returns true if there is an overlapping collision
};

/**
 * Inserts a new showtime entry into the PostgreSQL shows table
 */
const insertShow = async (showData) => {
  const { movieId, theaterId, showTime, ticketPrice } = showData;
  
  const query = `
    INSERT INTO shows (movie_id, theater_id, show_time, ticket_price)
    VALUES ($1, $2, $3, $4)
    RETURNING id, movie_id, theater_id, show_time, ticket_price, created_at;
  `;
  
  const values = [movieId, theaterId, showTime, ticketPrice];
  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = {
  checkConflict,
  insertShow
};