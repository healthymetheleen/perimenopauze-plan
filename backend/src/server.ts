import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import corsMiddleware from './middleware/cors.js';
import authRoutes from './routes/auth.js';
import diaryRoutes from './routes/diary.js';
import cycleRoutes from './routes/cycle.js';
import profileRoutes from './routes/profile.js';
import recipeRoutes from './routes/recipes.js';
import aiChatRoutes from './routes/ai-chat.js';
import paymentsRoutes from './routes/payments.js';
import pool from './config/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(corsMiddleware); // CORS configuration
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/payments', paymentsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  Perimenopauze Plan API                               ║
║  Environment: ${process.env.NODE_ENV || 'development'}                         ║
║  Port: ${PORT}                                           ║
║  URL: http://localhost:${PORT}                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
