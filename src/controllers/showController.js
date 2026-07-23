const showModel = require('../models/showModel');
const db = require('../config/db');

const scheduleShow = async (req, res) => {
  try {
    const { movieId, theaterId, showTime, ticketPrice } = req.body;

    // 1. Basic body validation validation check
    if (!movieId || !theaterId || !showTime || !ticketPrice) {
      return res.status(400).json({ error: "Missing required scheduling fields." });
    }

    // 2. Fetch the movie details to find out how long it runs
    const movieRes = await db.query('SELECT duration FROM movies WHERE id = $1', [movieId]);
    if (movieRes.rows.length === 0) {
      return res.status(404).json({ error: "Target movie asset not found." });
    }
    const duration = movieRes.rows[0].duration || 120; // Fallback default to 120 minutes if blank

    // 3. Evaluate the timeline block for conflicts
    const isConflicting = await showModel.checkConflict(theaterId, showTime, duration);
    if (isConflicting) {
      return res.status(409).json({ 
        error: "Scheduling collision! This theater screen is already booked during this time slot." 
      });
    }

    // 4. No collision found, record the schedule safely
    const newShow = await showModel.insertShow({ movieId, theaterId, showTime, ticketPrice });
    
    res.status(201).json({
      message: "Success! Showtime schedule created flawlessly.",
      show: newShow
    });

  } catch (error) {
    console.error("Schedule Show Error:", error);
    res.status(500).json({ error: "Internal server error while scheduling show." });
  }
};

module.exports = {
  scheduleShow
};