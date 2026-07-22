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
const getMovies = async (req, res) => {
  try {
    const movies = await movieModel.getAllMovies();
    res.status(200).json({ movies });
  } catch (error) {
    console.error("Get Movies Error:", error);
    res.status(500).json({ error: "Internal server error while fetching movies." });
  }
};

const removeMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const isDeleted = await movieModel.deleteMovieById(id);
    if (!isDeleted) {
      return res.status(404).json({ error: "Movie not found or already deleted." });
    }
    res.status(200).json({ message: "Movie successfully dropped from inventory." });
  } catch (error) {
    console.error("Delete Movie Error:", error);
    res.status(500).json({ error: "Internal server error while deleting movie." });
  }
};

module.exports = {
  createMovie,
  getMovies,  
  removeMovie 
}