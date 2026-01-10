import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest, DiaryEntry, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schema
const diarySchema = z.object({
  entry_date: z.string().datetime(),
  content: z.string().min(1),
  mood: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
  symptoms: z.array(z.string()).optional(),
});

// GET /api/diary - Get all diary entries for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { limit = '30', offset = '0', start_date, end_date } = req.query;

    let queryText = `
      SELECT id, user_id, entry_date, content, mood, energy_level, symptoms, created_at, updated_at
      FROM diary_entries
      WHERE user_id = $1
    `;
    const params: any[] = [req.user!.userId];

    // Add date filters if provided
    if (start_date) {
      params.push(start_date);
      queryText += ` AND entry_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      queryText += ` AND entry_date <= $${params.length}`;
    }

    queryText += ` ORDER BY entry_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query<DiaryEntry>(queryText, params);

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM diary_entries WHERE user_id = $1',
      [req.user!.userId]
    );

    return res.json({
      success: true,
      data: {
        entries: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }
    });
  } catch (error) {
    console.error('Get diary entries error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch diary entries'
    });
  }
});

// GET /api/diary/:id - Get single diary entry
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const result = await query<DiaryEntry>(
      'SELECT * FROM diary_entries WHERE id = $1 AND user_id = $2',
      [id, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Diary entry not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get diary entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch diary entry'
    });
  }
});

// POST /api/diary - Create new diary entry
router.post('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = diarySchema.parse(req.body);

    const result = await query<DiaryEntry>(
      `INSERT INTO diary_entries (user_id, entry_date, content, mood, energy_level, symptoms)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user!.userId,
        data.entry_date,
        data.content,
        data.mood || null,
        data.energy_level || null,
        data.symptoms || []
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

    console.error('Create diary entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create diary entry'
    });
  }
});

// PUT /api/diary/:id - Update diary entry
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const data = diarySchema.partial().parse(req.body);

    // Check if entry exists and belongs to user
    const checkResult = await query(
      'SELECT id FROM diary_entries WHERE id = $1 AND user_id = $2',
      [id, req.user!.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Diary entry not found'
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.entry_date) {
      updates.push(`entry_date = $${paramCount++}`);
      values.push(data.entry_date);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(data.content);
    }
    if (data.mood !== undefined) {
      updates.push(`mood = $${paramCount++}`);
      values.push(data.mood);
    }
    if (data.energy_level !== undefined) {
      updates.push(`energy_level = $${paramCount++}`);
      values.push(data.energy_level);
    }
    if (data.symptoms !== undefined) {
      updates.push(`symptoms = $${paramCount++}`);
      values.push(data.symptoms);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id, req.user!.userId);

    const result = await query<DiaryEntry>(
      `UPDATE diary_entries
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

    console.error('Update diary entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update diary entry'
    });
  }
});

// DELETE /api/diary/:id - Delete diary entry
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM diary_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Diary entry not found'
      });
    }

    return res.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete diary entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete diary entry'
    });
  }
});

export default router;
