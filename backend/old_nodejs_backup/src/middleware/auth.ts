import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user still exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found',
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token',
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Token verification failed',
    });
  }
};

export const generateAccessToken = (userId: string): string => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET!;
  const options: any = { expiresIn: process.env.JWT_EXPIRE || '7d' };
  return jwt.sign(payload, secret, options);
};

export const generateRefreshToken = (userId: string): string => {
  const payload = { userId };
  const secret = process.env.JWT_REFRESH_SECRET!;
  const options: any = { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' };
  return jwt.sign(payload, secret, options);
};

export const verifyRefreshToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Check if refresh token exists in database and is active
    const session = await UserSession.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    return null;
  }
};

export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  await UserSession.findOneAndUpdate(
    { refreshToken },
    { isActive: false }
  );
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await UserSession.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};
