import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '../config/database.js';
import { generateToken, generateRefreshToken, authenticateToken } from '../middleware/auth.js';
import { AuthRequest, User, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/signup
router.post('/signup', async (req, res: Response<ApiResponse>) => {
  try {
    const { email, password, full_name } = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await query<User>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, full_name, email_verified, is_premium, is_admin)
       VALUES ($1, $2, $3, false, false, false)
       RETURNING id, email, full_name, created_at, is_premium, is_admin`,
      [email, password_hash, full_name || null]
    );

    const user = result.rows[0];

    // Create user profile
    await query(
      `INSERT INTO profiles (user_id, language, notifications_enabled)
       VALUES ($1, 'nl', true)`,
      [user.id]
    );

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      is_premium: user.is_premium,
      is_admin: user.is_admin || false
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      is_premium: user.is_premium,
      is_admin: user.is_admin || false
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          is_premium: user.is_premium,
          is_admin: user.is_admin || false
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response<ApiResponse>) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const result = await query<User>(
      'SELECT id, email, password_hash, full_name, is_premium, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      is_premium: user.is_premium,
      is_admin: user.is_admin || false
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      is_premium: user.is_premium,
      is_admin: user.is_admin || false
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          is_premium: user.is_premium,
          is_admin: user.is_admin || false
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error'
      });
    }

    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const result = await query<User & { profile: any }>(
      `SELECT u.id, u.email, u.full_name, u.is_premium, u.is_admin, u.created_at,
              json_build_object(
                'date_of_birth', p.date_of_birth,
                'height', p.height,
                'weight', p.weight,
                'language', p.language,
                'notifications_enabled', p.notifications_enabled
              ) as profile
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_premium: user.is_premium,
        is_admin: user.is_admin || false,
        created_at: user.created_at,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint exists for consistency and future token invalidation
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
