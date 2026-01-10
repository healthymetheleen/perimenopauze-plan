import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { query } from '../config/database.js';

/**
 * Middleware to check if user is admin
 * Use this AFTER authenticateToken middleware
 *
 * Example:
 * router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
 *   // Only admins can access this
 * });
 */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Je moet ingelogd zijn om deze pagina te bekijken.'
      });
    }

    // Check if user is admin
    const result = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Gebruiker niet gevonden.'
      });
    }

    const isAdmin = result.rows[0].is_admin;

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Je hebt geen toegang tot deze pagina. Alleen admins hebben toegang.'
      });
    }

    // User is admin, continue
    next();

  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Er ging iets mis bij het controleren van admin rechten.'
    });
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  adminUserId: string,
  actionType: string,
  targetTable?: string,
  targetId?: string,
  details?: any
) {
  try {
    await query(
      `INSERT INTO admin_logs (admin_user_id, action_type, target_table, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminUserId, actionType, targetTable || null, targetId || null, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}
