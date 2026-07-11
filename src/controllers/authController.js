const userModel = require('../models/userModel');

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation includes name now
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // 2. Check for existing user
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // 3. Create user
    const newUser = await userModel.createUser(name, email, password, 'ATTENDEE');

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Database connection refused. Check your PostgreSQL env vars and make sure the database is running.'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser
};