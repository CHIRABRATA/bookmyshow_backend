const db = require('../config/db');

const ensureTheatersTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS theaters (
      id SERIAL PRIMARY KEY
    );
  `);

  await db.query(`
    ALTER TABLE theaters
    ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  `);

  await db.query(`
    ALTER TABLE theaters
    ADD COLUMN IF NOT EXISTS location VARCHAR(255);
  `);

  await db.query(`
    ALTER TABLE theaters
    ADD COLUMN IF NOT EXISTS capacity INT;
  `);
};

const createTheater = async (req, res) => {
  try {
    const { name, location, capacity } = req.body;
    const parsedCapacity = Number(capacity);

    if (!name || !location || Number.isNaN(parsedCapacity)) {
      return res.status(400).json({ error: 'Name, location, and capacity are required.' });
    }

    await ensureTheatersTable();

    const result = await db.query(
      `INSERT INTO theaters (name, location, capacity)
       VALUES ($1, $2, $3)
       RETURNING id, name, location, capacity;`,
      [name, location, parsedCapacity]
    );

    return res.status(201).json({
      success: true,
      theater: result.rows[0]
    });
  } catch (error) {
    console.error('Create theater error:', error);
    return res.status(500).json({ error: 'Failed to create theater.' });
  }
};

const getTheaters = async (req, res) => {
  try {
    await ensureTheatersTable();

    const result = await db.query(`
      SELECT id, name, location, capacity
      FROM theaters
      ORDER BY id ASC;
    `);

    return res.status(200).json({
      success: true,
      theaters: result.rows
    });
  } catch (error) {
    console.error('Get theaters error:', error);
    return res.status(500).json({ error: 'Failed to fetch theaters.' });
  }
};

module.exports = {
  createTheater,
  getTheaters
};
