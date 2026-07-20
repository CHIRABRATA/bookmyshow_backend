const movieModel = require('../models/movieModel'); // 1. Import the new model file

/**
 * Movie Management Controller
 */
const createMovie = async (req, res) => {
  try {
    const { title, genre, duration, price } = req.body;

    // Basic Input Validation
    if (!title || !price) {
      return res.status(400).json({ error: "Title and price are required fields." });
    }

    // 2. Call the database model layer passing the request body and the token context
    const newMovie = await movieModel.insertMovie(
      { title, genre, duration, price }, 
      req.user.id
    );

    // 3. Respond with clean, verified database records
    res.status(201).json({
      message: "Success! New movie added to the database.",
      movie: newMovie
    });

  } catch (error) {
    console.error("Create Movie Error:", error);
    res.status(500).json({ error: "Internal server error while creating movie." });
  }
};

module.exports = {
  createMovie
};