import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest, CycleData, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schema
const cycleSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  flow_intensity: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

// GET /api/cycle - Get all cycle data for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { limit = '12', offset = '0' } = req.query;

    const result = await query<CycleData>(
      `SELECT id, user_id, start_date, end_date, flow_intensity, notes, created_at, updated_at
       FROM cycle_data
       WHERE user_id = $1
       ORDER BY start_date DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.userId, limit, offset]
    );

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM cycle_data WHERE user_id = $1',
      [req.user!.userId]
    );

    return res.json({
      success: true,
      data: {
        cycles: result.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('Get cycle data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch cycle data'
    });
  }
});

// GET /api/cycle/current - Get current/active cycle
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const result = await query<CycleData>(
      `SELECT * FROM cycle_data
       WHERE user_id = $1 AND end_date IS NULL
       ORDER BY start_date DESC
       LIMIT 1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active cycle found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get current cycle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch current cycle'
    });
  }
});

// GET /api/cycle/predictions - Get cycle predictions
router.get('/predictions', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    // Get last 3 completed cycles to calculate average
    const result = await query<CycleData>(
      `SELECT start_date, end_date,
              EXTRACT(DAY FROM (end_date - start_date)) as cycle_length
       FROM cycle_data
       WHERE user_id = $1 AND end_date IS NOT NULL
       ORDER BY start_date DESC
       LIMIT 3`,
      [req.user!.userId]
    );

    if (result.rows.length < 2) {
      return res.json({
        success: true,
        data: {
          message: 'Need at least 2 completed cycles for predictions',
          next_cycle_date: null,
          average_cycle_length: null
        }
      });
    }

    // Calculate average cycle length
    const cycleLengths = result.rows.map(row => parseInt((row as any).cycle_length));
    const avgLength = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);

    // Get last cycle end date
    const lastCycleEndDate = new Date(result.rows[0].end_date!);

    // Predict next cycle
    const nextCycleDate = new Date(lastCycleEndDate);
    nextCycleDate.setDate(nextCycleDate.getDate() + avgLength);

    return res.json({
      success: true,
      data: {
        average_cycle_length: avgLength,
        last_cycle_end: lastCycleEndDate,
        next_cycle_date: nextCycleDate,
        prediction_based_on: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get cycle predictions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate cycle predictions'
    });
  }
});

// POST /api/cycle - Create new cycle
router.post('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = cycleSchema.parse(req.body);

    // Check if there's already an active cycle
    const activeCheck = await query(
      'SELECT id FROM cycle_data WHERE user_id = $1 AND end_date IS NULL',
      [req.user!.userId]
    );

    if (activeCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active cycle. Please end it first.'
      });
    }

    const result = await query<CycleData>(
      `INSERT INTO cycle_data (user_id, start_date, end_date, flow_intensity, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user!.userId,
        data.start_date,
        data.end_date || null,
        data.flow_intensity || null,
        data.notes || null
      ]
    );

    return res.status(201).json({
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

    console.error('Create cycle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create cycle'
    });
  }
});

// PUT /api/cycle/:id - Update cycle
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const data = cycleSchema.partial().parse(req.body);

    // Check ownership
    const checkResult = await query(
      'SELECT id FROM cycle_data WHERE id = $1 AND user_id = $2',
      [id, req.user!.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cycle not found'
      });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.start_date) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(data.start_date);
    }
    if (data.end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(data.end_date);
    }
    if (data.flow_intensity !== undefined) {
      updates.push(`flow_intensity = $${paramCount++}`);
      values.push(data.flow_intensity);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id, req.user!.userId);

    const result = await query<CycleData>(
      `UPDATE cycle_data
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error'
      });
    }

    console.error('Update cycle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update cycle'
    });
    }
});

// DELETE /api/cycle/:id - Delete cycle
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM cycle_data WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cycle not found'
      });
    }

    return res.json({
      success: true,
      message: 'Cycle deleted successfully'
    });
  } catch (error) {
    console.error('Delete cycle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete cycle'
    });
  }
});

export default router;
