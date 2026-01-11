import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireAdmin, logAdminAction } from '../middleware/admin.js';
import { query } from '../config/database.js';

const router = Router();

// All routes require admin
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================
// MEDITATIES MANAGEMENT
// ============================================

const MeditationSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  duration_minutes: z.number().int().positive(),
  audio_url: z.string().url().optional(),
  script: z.string(),
  category: z.enum(['breathing', 'body_scan', 'visualization', 'mindfulness']),
  is_premium: z.boolean().default(false),
});

/**
 * GET /api/admin-content/meditations
 * List all meditations
 */
router.get('/meditations', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT id, title, description, duration_minutes, category, is_premium, created_at
      FROM meditations
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: { meditations: result.rows } });
  } catch (error) {
    console.error('Get meditations error:', error);
    res.status(500).json({ error: 'Failed to get meditations' });
  }
});

/**
 * POST /api/admin-content/meditations
 * Create new meditation
 */
router.post('/meditations', async (req: AuthRequest, res: Response) => {
  try {
    const data = MeditationSchema.parse(req.body);

    const result = await query(`
      INSERT INTO meditations (title, description, duration_minutes, audio_url, script, category, is_premium)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title
    `, [data.title, data.description, data.duration_minutes, data.audio_url, data.script, data.category, data.is_premium]);

    await logAdminAction(req.user!.userId, 'CREATE_MEDITATION', 'meditations', result.rows[0].id, { title: data.title });

    res.json({ success: true, data: result.rows[0], message: 'Meditatie aangemaakt' });
  } catch (error: any) {
    console.error('Create meditation error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create meditation' });
  }
});

/**
 * PUT /api/admin-content/meditations/:id
 * Update meditation
 */
router.put('/meditations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = MeditationSchema.partial().parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    await query(
      `UPDATE meditations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    await logAdminAction(req.user!.userId, 'UPDATE_MEDITATION', 'meditations', id, data);

    res.json({ success: true, message: 'Meditatie bijgewerkt' });
  } catch (error) {
    console.error('Update meditation error:', error);
    res.status(500).json({ error: 'Failed to update meditation' });
  }
});

/**
 * DELETE /api/admin-content/meditations/:id
 */
router.delete('/meditations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM meditations WHERE id = $1', [id]);
    await logAdminAction(req.user!.userId, 'DELETE_MEDITATION', 'meditations', id);

    res.json({ success: true, message: 'Meditatie verwijderd' });
  } catch (error) {
    console.error('Delete meditation error:', error);
    res.status(500).json({ error: 'Failed to delete meditation' });
  }
});

// ============================================
// BEWEGINGEN MANAGEMENT
// ============================================

const MovementSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  duration_minutes: z.number().int().positive(),
  video_url: z.string().url().optional(),
  instructions: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  category: z.enum(['cardio', 'strength', 'flexibility', 'yoga', 'pilates']),
  equipment_needed: z.array(z.string()).optional(),
  is_premium: z.boolean().default(false),
});

/**
 * GET /api/admin-content/movements
 */
router.get('/movements', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT id, title, description, duration_minutes, difficulty, category, is_premium, created_at
      FROM movement_exercises
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: { movements: result.rows } });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Failed to get movements' });
  }
});

/**
 * POST /api/admin-content/movements
 */
router.post('/movements', async (req: AuthRequest, res: Response) => {
  try {
    const data = MovementSchema.parse(req.body);

    const result = await query(`
      INSERT INTO movement_exercises (title, description, duration_minutes, video_url, instructions, difficulty, category, equipment_needed, is_premium)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title
    `, [data.title, data.description, data.duration_minutes, data.video_url, data.instructions, data.difficulty, data.category, data.equipment_needed, data.is_premium]);

    await logAdminAction(req.user!.userId, 'CREATE_MOVEMENT', 'movement_exercises', result.rows[0].id, { title: data.title });

    res.json({ success: true, data: result.rows[0], message: 'Beweging aangemaakt' });
  } catch (error: any) {
    console.error('Create movement error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create movement' });
  }
});

/**
 * DELETE /api/admin-content/movements/:id
 */
router.delete('/movements/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM movement_exercises WHERE id = $1', [id]);
    await logAdminAction(req.user!.userId, 'DELETE_MOVEMENT', 'movement_exercises', id);

    res.json({ success: true, message: 'Beweging verwijderd' });
  } catch (error) {
    console.error('Delete movement error:', error);
    res.status(500).json({ error: 'Failed to delete movement' });
  }
});

// ============================================
// RECEPTEN MANAGEMENT (Enhanced)
// ============================================

const RecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  prep_time: z.number().int().positive(),
  cook_time: z.number().int().positive(),
  servings: z.number().int().positive(),
  calories_per_serving: z.number().int().optional(),
  proteins_per_serving: z.number().optional(),
  carbs_per_serving: z.number().optional(),
  fats_per_serving: z.number().optional(),
  image_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  is_premium: z.boolean().default(false),
  category: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']).optional(),
});

/**
 * POST /api/admin-content/recipes
 */
router.post('/recipes', async (req: AuthRequest, res: Response) => {
  try {
    const data = RecipeSchema.parse(req.body);

    const result = await query(`
      INSERT INTO recipes (
        title, description, ingredients, instructions,
        prep_time, cook_time, servings,
        calories_per_serving, proteins_per_serving, carbs_per_serving, fats_per_serving,
        image_url, tags, is_premium, category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, title
    `, [
      data.title, data.description, data.ingredients, data.instructions,
      data.prep_time, data.cook_time, data.servings,
      data.calories_per_serving, data.proteins_per_serving, data.carbs_per_serving, data.fats_per_serving,
      data.image_url, data.tags, data.is_premium, data.category
    ]);

    await logAdminAction(req.user!.userId, 'CREATE_RECIPE', 'recipes', result.rows[0].id, { title: data.title });

    res.json({ success: true, data: result.rows[0], message: 'Recept aangemaakt' });
  } catch (error: any) {
    console.error('Create recipe error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

/**
 * PUT /api/admin-content/recipes/:id
 */
router.put('/recipes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = RecipeSchema.partial().parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    await query(
      `UPDATE recipes SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    await logAdminAction(req.user!.userId, 'UPDATE_RECIPE', 'recipes', id, data);

    res.json({ success: true, message: 'Recept bijgewerkt' });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// ============================================
// EDUCATIE CONTENT MANAGEMENT
// ============================================

const EducationSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  category: z.enum(['symptoms', 'hormones', 'lifestyle', 'treatments']),
  reading_time_minutes: z.number().int().positive(),
  author: z.string().optional(),
  image_url: z.string().url().optional(),
  is_premium: z.boolean().default(false),
});

/**
 * GET /api/admin-content/education
 */
router.get('/education', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT id, title, category, reading_time_minutes, is_premium, created_at
      FROM education_articles
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: { articles: result.rows } });
  } catch (error) {
    console.error('Get education articles error:', error);
    res.status(500).json({ error: 'Failed to get education articles' });
  }
});

/**
 * POST /api/admin-content/education
 */
router.post('/education', async (req: AuthRequest, res: Response) => {
  try {
    const data = EducationSchema.parse(req.body);

    const result = await query(`
      INSERT INTO education_articles (title, content, category, reading_time_minutes, author, image_url, is_premium)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title
    `, [data.title, data.content, data.category, data.reading_time_minutes, data.author, data.image_url, data.is_premium]);

    await logAdminAction(req.user!.userId, 'CREATE_EDUCATION', 'education_articles', result.rows[0].id, { title: data.title });

    res.json({ success: true, data: result.rows[0], message: 'Artikel aangemaakt' });
  } catch (error: any) {
    console.error('Create education article error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create education article' });
  }
});

/**
 * DELETE /api/admin-content/education/:id
 */
router.delete('/education/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM education_articles WHERE id = $1', [id]);
    await logAdminAction(req.user!.userId, 'DELETE_EDUCATION', 'education_articles', id);

    res.json({ success: true, message: 'Artikel verwijderd' });
  } catch (error) {
    console.error('Delete education article error:', error);
    res.status(500).json({ error: 'Failed to delete education article' });
  }
});

export default router;
