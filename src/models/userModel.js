const db = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Creates a new user in the database
 * @param {string} email 
 * @param {string} plainTextPassword 
 * @param {string} role - 'ADMIN', 'ORGANISER', or 'ATTENDEE'
 */
const createUser = async (email, plainTextPassword, role = 'ATTENDEE') => {
  // 1. Generate a salt and hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(plainTextPassword, saltRounds);

  // 2. Insert into the database
  const query = `
    INSERT INTO users (email, password_hash, role) 
    VALUES ($1, $2, $3) 
    RETURNING id, email, role, created_at;
  `;
  
  // 3. Execute the query using our connection pool
  const values = [email, passwordHash, role];
  const result = await db.query(query, values);
  
  // Return the newly created user (without the password hash!)
  return result.rows[0];
};

/**
 * Finds a user by their email address (used for login and duplicate checks)
 * @param {string} email 
 */
const findUserByEmail = async (email) => {
  const query = `SELECT * FROM users WHERE email = $1;`;
  const result = await db.query(query, [email]);
  return result.rows[0]; // Returns undefined if no user is found
};

module.exports = {
  createUser,
  findUserByEmail
};