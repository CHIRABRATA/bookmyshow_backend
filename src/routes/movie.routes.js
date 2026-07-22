const express = require('express');
const movieController = require('../controllers/movieController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

// 1. READ ALL MOVIES: Public route (No middleware gates required!)
router.get('/', movieController.getMovies);

// 2. CREATE MOVIE: Guarded (Must be Logged In AND an Admin)
router.post('/', authenticateToken, authorizeRoles('ADMIN'), movieController.createMovie);

// 3. DELETE MOVIE: Guarded (Must be Logged In AND an Admin)
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), movieController.removeMovie);

module.exports = router;