//here is admin routes for the application
const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Route to fetch admin dashboard statistics
router.get('/dashboard', adminController.getDashboardStats);

module.exports = router;
