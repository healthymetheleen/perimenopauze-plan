import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest, UserProfile, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schema
const profileSchema = z.object({
  date_of_birth: z.string().datetime().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  language: z.enum(['nl', 'en']).optional(),
  notifications_enabled: z.boolean().optional(),
});

// GET /api/profile - Get user profile
router.get('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const result = await query<UserProfile>(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// PUT /api/profile - Update user profile
router.put('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = profileSchema.parse(req.body);

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(data.date_of_birth);
    }
    if (data.height !== undefined) {
      updates.push(`height = $${paramCount++}`);
      values.push(data.height);
    }
    if (data.weight !== undefined) {
      updates.push(`weight = $${paramCount++}`);
      values.push(data.weight);
    }
    if (data.language !== undefined) {
      updates.push(`language = $${paramCount++}`);
      values.push(data.language);
    }
    if (data.notifications_enabled !== undefined) {
      updates.push(`notifications_enabled = $${paramCount++}`);
      values.push(data.notifications_enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(req.user!.userId);

    const result = await query<UserProfile>(
      `UPDATE profiles
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

export default router;
