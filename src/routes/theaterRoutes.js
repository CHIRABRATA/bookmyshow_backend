const express = require('express');
const theaterController = require('../controllers/theaterController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post('/', authenticateToken, authorizeRoles('ADMIN'), theaterController.createTheater);
router.get('/', theaterController.getTheaters);

module.exports = router;
