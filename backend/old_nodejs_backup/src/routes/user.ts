import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { AnalysisResult } from '../models/AnalysisResult';
import { UserSession } from '../models/UserSession';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('registerNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Register number cannot exceed 50 characters'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', asyncHandler(async (req: AuthRequest, res) => {
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
      updatedAt: user.updatedAt,
    },
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateProfileValidation, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { name, registerNumber } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (registerNumber !== undefined) updateData.registerNumber = registerNumber;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw createError('User not found', 404);
  }

  logger.info('User profile updated', { userId: user._id, updates: updateData });

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      registerNumber: user.registerNumber,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}));

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', changePasswordValidation, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      error: 'Invalid current password',
      message: 'The current password you entered is incorrect',
    });
  }

  // Hash new password
  const bcrypt = await import('bcryptjs');
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  user.password = hashedNewPassword;
  await user.save();

  logger.info('User password changed', { userId: user._id });

  res.json({
    message: 'Password changed successfully',
  });
}));

// @route   GET /api/users/analysis-history
// @desc    Get user's analysis history
// @access  Private
router.get('/analysis-history', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const type = req.query.type as string;
  const skip = (page - 1) * limit;

  // Build query
  const query: any = { userId: req.user.id };
  if (type && ['fake_news', 'review', 'website'].includes(type)) {
    query.type = type;
  }

  // Get analysis results
  const analysisResults = await AnalysisResult.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-userId');

  // Get total count
  const totalCount = await AnalysisResult.countDocuments(query);

  res.json({
    analysisHistory: analysisResults,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1,
    },
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  // Get analysis counts by type
  const analysisStats = await AnalysisResult.aggregate([
    { $match: { userId: req.user.id } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        latestAnalysis: { $max: '$createdAt' },
      },
    },
  ]);

  // Get verdict distribution
  const verdictStats = await AnalysisResult.aggregate([
    { $match: { userId: req.user.id } },
    {
      $group: {
        _id: '$result.verdict',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get total analyses
  const totalAnalyses = await AnalysisResult.countDocuments({ userId: req.user.id });

  // Get user info
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      memberSince: user.createdAt,
    },
    stats: {
      totalAnalyses,
      analysisByType: analysisStats,
      verdictDistribution: verdictStats,
    },
  });
}));

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({
      error: 'Password required',
      message: 'Please provide your password to delete your account',
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({
      error: 'Invalid password',
      message: 'The password you entered is incorrect',
    });
  }

  // Delete user's analysis history
  await AnalysisResult.deleteMany({ userId: req.user.id });

  // Delete user sessions
  await UserSession.deleteMany({ userId: req.user.id });

  // Delete user account
  await User.findByIdAndDelete(req.user.id);

  logger.info('User account deleted', { userId: req.user.id });

  res.json({
    message: 'Account deleted successfully',
  });
}));

export default router;
