import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireAdmin, logAdminAction } from '../middleware/admin.js';
import { query } from '../config/database.js';

const router = Router();

// All admin routes require authentication AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // Get overall statistics
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_premium = true) as premium_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month,
        (SELECT COUNT(*) FROM diary_entries) as total_diary_entries,
        (SELECT COUNT(*) FROM recipes) as total_recipes,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) FROM subscriptions WHERE status = 'active') as monthly_revenue
    `);

    // Get user growth data (last 30 days)
    const userGrowth = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get recent admin actions
    const recentActions = await query(`
      SELECT
        al.id,
        al.action_type,
        al.target_table,
        al.created_at,
        u.email as admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      userGrowth: userGrowth.rows,
      recentActions: recentActions.rows
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params: any[] = [limit, offset];

    if (search) {
      whereClause = `WHERE u.email ILIKE $3 OR p.full_name ILIKE $3`;
      params.push(`%${search}%`);
    }

    const users = await query(`
      SELECT
        u.id,
        u.email,
        u.is_premium,
        u.is_admin,
        u.email_verified,
        u.created_at,
        p.full_name,
        p.date_of_birth,
        (SELECT COUNT(*) FROM diary_entries WHERE user_id = u.id) as diary_count,
        s.status as subscription_status,
        s.plan_type
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'cancelled')
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM users u LEFT JOIN profiles p ON u.id = p.user_id ${whereClause}`,
      search ? [`%${search}%`] : []
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: users.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await query(`
      SELECT
        u.id,
        u.email,
        u.is_premium,
        u.is_admin,
        u.email_verified,
        u.created_at,
        p.*
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's subscriptions
    const subscriptions = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Get recent diary entries count
    const diaryStats = await query(`
      SELECT
        COUNT(*) as total_entries,
        COUNT(DISTINCT DATE(entry_date)) as days_tracked,
        MAX(entry_date) as last_entry_date
      FROM diary_entries
      WHERE user_id = $1
    `, [userId]);

    res.json({
      user: user.rows[0],
      subscriptions: subscriptions.rows,
      diaryStats: diaryStats.rows[0]
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (make admin, grant premium, etc.)
 */
router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { is_admin, is_premium, email_verified } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (typeof is_admin === 'boolean') {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(is_admin);
    }

    if (typeof is_premium === 'boolean') {
      updates.push(`is_premium = $${paramIndex++}`);
      values.push(is_premium);
    }

    if (typeof email_verified === 'boolean') {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(email_verified);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(userId);

    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    // Log admin action
    await logAdminAction(
      req.user!.userId,
      'UPDATE_USER',
      'users',
      userId,
      { is_admin, is_premium, email_verified }
    );

    res.json({ success: true, message: 'Gebruiker bijgewerkt' });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user account (admin only, for GDPR compliance)
 */
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const adminId = req.user!.userId;

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'Je kunt je eigen admin account niet verwijderen.'
      });
    }

    // Get user email for logging
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // Delete user (cascade will delete all related data)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    // Log admin action
    await logAdminAction(
      adminId,
      'DELETE_USER',
      'users',
      userId,
      { email: userEmail, reason: 'Admin deletion' }
    );

    res.json({ success: true, message: 'Gebruiker verwijderd' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/recipes
 * Manage all recipes (for content management)
 */
router.get('/recipes', async (req: AuthRequest, res: Response) => {
  try {
    const recipes = await query(`
      SELECT
        id,
        title,
        description,
        prep_time,
        cook_time,
        servings,
        is_premium,
        created_at
      FROM recipes
      ORDER BY created_at DESC
    `);

    res.json({ recipes: recipes.rows });

  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
});

/**
 * DELETE /api/admin/recipes/:id
 * Delete a recipe
 */
router.delete('/recipes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const recipeId = req.params.id;

    await query('DELETE FROM recipes WHERE id = $1', [recipeId]);

    // Log admin action
    await logAdminAction(
      req.user!.userId,
      'DELETE_RECIPE',
      'recipes',
      recipeId
    );

    res.json({ success: true, message: 'Recept verwijderd' });

  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

/**
 * GET /api/admin/logs
 * View admin action logs
 */
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = await query(`
      SELECT
        al.id,
        al.action_type,
        al.target_table,
        al.target_id,
        al.details,
        al.created_at,
        u.email as admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM admin_logs');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: logs.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

export default router;
