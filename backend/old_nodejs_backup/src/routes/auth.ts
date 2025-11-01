import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  revokeRefreshToken,
  revokeAllUserSessions,
  AuthRequest 
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      error: 'User already exists',
      message: 'An account with this email already exists',
    });
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = new User({
    email,
    password: hashedPassword,
    name,
  });

  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  // Save refresh token to database
  const session = new UserSession({
    userId: user._id.toString(),
    refreshToken,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  await session.save();

  logger.info('User registered successfully', { userId: user._id, email });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Invalid email or password',
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Invalid email or password',
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  // Save refresh token to database
  const session = new UserSession({
    userId: user._id.toString(),
    refreshToken,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  await session.save();

  logger.info('User logged in successfully', { userId: user._id, email });

  res.json({
    message: 'Login successful',
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      registerNumber: user.registerNumber,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'Refresh token required',
      message: 'Please provide a refresh token',
    });
  }

  const userId = await verifyRefreshToken(refreshToken);
  if (!userId) {
    return res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Refresh token is invalid or expired',
    });
  }

  // Generate new access token
  const newAccessToken = generateAccessToken(userId);

  res.json({
    message: 'Token refreshed successfully',
    accessToken: newAccessToken,
  });
}));

// @route   POST /api/auth/logout
// @desc    Logout user (revoke refresh token)
// @access  Private
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  res.json({
    message: 'Logout successful',
  });
}));

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  await revokeAllUserSessions(req.user.id);

  res.json({
    message: 'Logged out from all devices successfully',
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      registerNumber: user.registerNumber,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
  });
}));

export default router;
