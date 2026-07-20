const db = require('../config/db'); // Adjust path to match your database pool configuration

/**
 * Inserts a new movie entry into the PostgreSQL database.
 * @param {Object} movieData - The movie metadata body
 * @param {string} createdBy - The UUID of the authenticated Admin user
 */
const insertMovie = async (movieData, createdBy) => {
  const { title, genre, duration, price } = movieData;

  const query = `
    INSERT INTO movies (title, genre, duration, price, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, title, genre, duration, price, created_by, created_at;
  `;

  const values = [title, genre, duration || null, price, createdBy];
  const result = await db.query(query, values);
  
  return result.rows[0]; // Return the freshly written row back to the controller layer
};

module.exports = {
  insertMovie
};