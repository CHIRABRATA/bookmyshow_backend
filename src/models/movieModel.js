const db = require('../config/db'); 

/**
 * Inserts a new movie entry into the PostgreSQL database.
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
  
  return result.rows[0];
};

/**
 * Fetches all movies from the system
 */
const getAllMovies = async () => {
  const query = 'SELECT id, title, genre, duration, price FROM movies ORDER BY created_at DESC;';
  const result = await db.query(query);
  return result.rows;
};

/**
 * Removes a movie entry from the system
 */
const deleteMovieById = async (id) => {
  const query = 'DELETE FROM movies WHERE id = $1 RETURNING id;';
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
};

// Make absolutely sure EVERYTHING is exported here!
module.exports = {
  insertMovie,
  getAllMovies,
  deleteMovieById
};