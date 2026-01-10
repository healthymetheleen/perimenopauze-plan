import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload, ApiResponse } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function authenticateToken(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No authentication token provided'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = payload;
    } catch (error) {
      // Token invalid but continue anyway
    }
  }

  next();
}

export function requirePremium(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.is_premium) {
    return res.status(403).json({
      success: false,
      error: 'Premium subscription required'
    });
  }

  next();
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
}
