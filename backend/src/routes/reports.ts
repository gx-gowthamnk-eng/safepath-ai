import { Router, Response } from 'express';
import { query } from '../lib/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all reports (open to all authorized users to build safety map)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM reports ORDER BY created_at DESC');
    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a report
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { category, description, latitude, longitude, safety_rating } = req.body;

  if (!category || latitude === undefined || longitude === undefined || safety_rating === undefined) {
    return res.status(400).json({ error: 'Category, coordinates, and safety rating are required' });
  }

  try {
    const userId = req.user ? req.user.id : null;
    const result = await query(
      'INSERT INTO reports (user_id, category, description, latitude, longitude, safety_rating) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, category, description || '', latitude, longitude, safety_rating]
    );

    res.status(201).json({ report: result.rows[0] });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a report (Admin only)
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const reportId = req.params.id;

  try {
    const result = await query('DELETE FROM reports WHERE id = $1', [reportId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
