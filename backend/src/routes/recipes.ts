import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { AuthRequest, Recipe, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schema
const recipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  prep_time: z.number().int().positive().optional(),
  cook_time: z.number().int().positive().optional(),
  servings: z.number().int().positive().default(1),
  calories_per_serving: z.number().int().positive().optional(),
  proteins_per_serving: z.number().positive().optional(),
  carbs_per_serving: z.number().positive().optional(),
  fats_per_serving: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().default(true),
});

// GET /api/recipes - Get all public recipes (+ user's private recipes if authenticated)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { limit = '20', offset = '0', search, tags } = req.query;

    let queryText = `
      SELECT id, title, description, ingredients, instructions, prep_time, cook_time,
             servings, calories_per_serving, proteins_per_serving, carbs_per_serving,
             fats_per_serving, image_url, tags, is_public, created_by, created_at, updated_at
      FROM recipes
      WHERE is_public = true
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Include user's private recipes if authenticated
    if (req.user) {
      queryText += ` OR created_by = $${paramCount}`;
      params.push(req.user.userId);
      paramCount++;
    }

    // Search filter
    if (search) {
      queryText += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      queryText += ` AND tags && $${paramCount}::text[]`;
      params.push(tagArray);
      paramCount++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query<Recipe>(queryText, params);

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM recipes WHERE is_public = true',
      []
    );

    return res.json({
      success: true,
      data: {
        recipes: result.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes'
    });
  }
});

// GET /api/recipes/:id - Get single recipe
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    let queryText = 'SELECT * FROM recipes WHERE id = $1 AND (is_public = true';
    const params: any[] = [id];

    if (req.user) {
      queryText += ' OR created_by = $2)';
      params.push(req.user.userId);
    } else {
      queryText += ')';
    }

    const result = await query<Recipe>(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get recipe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recipe'
    });
  }
});

// POST /api/recipes - Create new recipe (requires auth)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = recipeSchema.parse(req.body);

    const result = await query<Recipe>(
      `INSERT INTO recipes (
        title, description, ingredients, instructions, prep_time, cook_time,
        servings, calories_per_serving, proteins_per_serving, carbs_per_serving,
        fats_per_serving, image_url, tags, is_public, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.title,
        data.description || null,
        data.ingredients,
        data.instructions,
        data.prep_time || null,
        data.cook_time || null,
        data.servings,
        data.calories_per_serving || null,
        data.proteins_per_serving || null,
        data.carbs_per_serving || null,
        data.fats_per_serving || null,
        data.image_url || null,
        data.tags || [],
        data.is_public,
        req.user!.userId
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

    console.error('Create recipe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create recipe'
    });
  }
});

// PUT /api/recipes/:id - Update recipe (only if created by user)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const data = recipeSchema.partial().parse(req.body);

    // Check ownership
    const checkResult = await query(
      'SELECT id FROM recipes WHERE id = $1 AND created_by = $2',
      [id, req.user!.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found or not authorized'
      });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id, req.user!.userId);

    const result = await query<Recipe>(
      `UPDATE recipes
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND created_by = $${paramCount + 1}
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

    console.error('Update recipe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update recipe'
    });
  }
});

// DELETE /api/recipes/:id - Delete recipe (only if created by user)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM recipes WHERE id = $1 AND created_by = $2 RETURNING id',
      [id, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found or not authorized'
      });
    }

    return res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('Delete recipe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete recipe'
    });
  }
});

export default router;
