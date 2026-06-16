import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { query } from './lib/db';
import { authenticateToken, requireAdmin, AuthRequest } from './middleware/auth';
import authRouter from './routes/auth';
import contactsRouter from './routes/contacts';
import reportsRouter from './routes/reports';
import sosRouter from './routes/sos';
import tripsRouter from './routes/trips';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable wide CORS for local development & Next.js clients
app.use(cors());

// Configure JSON parser with higher limits to allow base64 video/audio uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded evidence files statically
app.use('/uploads', express.static(uploadsDir));

// Route Mounts
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sos', sosRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Admin Metrics API (RBAC-protected)
app.get('/api/admin/metrics', authenticateToken as any, requireAdmin as any, async (req: AuthRequest, res) => {
  try {
    const usersCount = await query('SELECT COUNT(*) FROM users');
    const tripsCount = await query('SELECT COUNT(*) FROM trips');
    const activeTripsCount = await query("SELECT COUNT(*) FROM trips WHERE status = 'active'");
    const reportsCount = await query('SELECT COUNT(*) FROM reports');
    const activeSosCount = await query("SELECT COUNT(*) FROM sos_events WHERE status = 'active'");

    res.json({
      metrics: {
        total_users: parseInt(usersCount.rows[0]?.count || '0'),
        total_trips: parseInt(tripsCount.rows[0]?.count || '0'),
        active_trips: parseInt(activeTripsCount.rows[0]?.count || '0'),
        total_reports: parseInt(reportsCount.rows[0]?.count || '0'),
        active_sos_alerts: parseInt(activeSosCount.rows[0]?.count || '0')
      }
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Boot Server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 SafePath AI Backend started on port ${PORT}`);
  console.log(`👉 API Health endpoint: http://localhost:${PORT}/health`);
  console.log(`========================================`);
});
