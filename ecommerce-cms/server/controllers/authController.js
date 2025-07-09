const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};

// Rate limiting storage (in production, use Redis or database)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

// Check rate limiting
const checkRateLimit = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now };
  
  // Reset if window expired
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return true;
  }
  
  // Check if exceeded limit
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  
  // Increment attempts
  attempts.count++;
  loginAttempts.set(identifier, attempts);
  return true;
};

// Generate secure JWT token
const generateToken = (userId, isAdmin) => {
  return jwt.sign(
    { 
      id: userId, 
      isAdmin: isAdmin,
      iat: Math.floor(Date.now() / 1000)
    }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: '24h',
      issuer: 'ecommerce-cms',
      audience: 'ecommerce-users'
    }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        msg: 'All fields are required',
        errors: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Validate name
    if (!validateName(name)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid name format',
        errors: { name: 'Name must be between 2 and 50 characters' }
      });
    }

    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid email format',
        errors: { email: 'Please provide a valid email address' }
      });
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Password does not meet security requirements',
        errors: { 
          password: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
        }
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        msg: 'User already exists',
        errors: { email: 'An account with this email already exists' }
      });
    }

    // Hash password with higher salt rounds for security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password: hashedPassword,
      isAdmin: false // Default to false for security
    });

    await user.save();

    // Generate token for immediate login
    const token = generateToken(user._id, user.isAdmin);

    res.status(201).json({ 
      success: true,
      msg: 'User created successfully',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        isAdmin: user.isAdmin 
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        msg: 'Email already exists',
        errors: { email: 'An account with this email already exists' }
      });
    }

    res.status(500).json({ 
      success: false,
      msg: 'Internal server error',
      errors: { general: 'Something went wrong. Please try again later.' }
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        msg: 'Email and password are required',
        errors: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid email format',
        errors: { email: 'Please provide a valid email address' }
      });
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    const identifier = `${email.toLowerCase()}-${clientIP}`;

    // Check rate limiting
    if (!checkRateLimit(identifier)) {
      return res.status(429).json({ 
        success: false,
        msg: 'Too many login attempts',
        errors: { 
          general: `Too many failed login attempts. Please try again after ${RATE_LIMIT_WINDOW / 60000} minutes.` 
        }
      });
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        msg: 'Invalid credentials',
        errors: { general: 'Invalid email or password' }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        msg: 'Invalid credentials',
        errors: { general: 'Invalid email or password' }
      });
    }

    // Clear rate limiting on successful login
    loginAttempts.delete(identifier);

    // Generate token
    const token = generateToken(user._id, user.isAdmin);

    res.status(200).json({ 
      success: true,
      msg: 'Login successful',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        isAdmin: user.isAdmin 
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Internal server error',
      errors: { general: 'Something went wrong. Please try again later.' }
    });
  }
};

// Additional security endpoint - logout (optional, for token blacklisting)
exports.logout = async (req, res) => {
  try {
    // In a production app, you'd want to blacklist the token
    // For now, just return success (client should remove token)
    res.status(200).json({ 
      success: true,
      msg: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Internal server error'
    });
  }
};
