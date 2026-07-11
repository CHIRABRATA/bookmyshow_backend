const userModel = require('../models/userModel');

const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 2. Check for existing user
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // 3. Create the user in the database
    // Defaulting to ATTENDEE. Later, we'll build a separate admin route for creating ORGANISERs.
    const newUser = await userModel.createUser(email, password, 'ATTENDEE');

    // 4. Send success response (Notice we do NOT send the password back!)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser
};