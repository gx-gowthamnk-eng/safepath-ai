import { Router, Response } from 'express';
import { query } from '../lib/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get active trip
router.get('/active', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await query(
      "SELECT * FROM trips WHERE user_id = $1 AND status = 'active' ORDER BY start_time DESC LIMIT 1",
      [req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No active trips' });
    }
    res.json({ trip: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all trips (or user's trip history)
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let result;
    if (req.user.role === 'admin') {
      result = await query('SELECT * FROM trips ORDER BY start_time DESC');
    } else {
      result = await query('SELECT * FROM trips WHERE user_id = $1 ORDER BY start_time DESC', [req.user.id]);
    }
    res.json({ trips: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start new trip
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { origin_address, destination_address, origin_lat, origin_lng, destination_lat, destination_lng } = req.body;

  if (origin_lat === undefined || origin_lng === undefined || destination_lat === undefined || destination_lng === undefined) {
    return res.status(400).json({ error: 'Missing location coordinates' });
  }

  try {
    // End any existing active trips first
    await query("UPDATE trips SET status = 'cancelled', end_time = $1 WHERE user_id = $2 AND status = 'active'", [new Date().toISOString(), req.user.id]);

    const result = await query(
      'INSERT INTO trips (user_id, origin_address, destination_address, origin_lat, origin_lng, destination_lat, destination_lng, current_lat, current_lng, battery_percent, safety_status, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 100, \'safe\', \'active\') RETURNING *',
      [
        req.user.id,
        origin_address || 'Current Location',
        destination_address || 'Destination',
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        origin_lat,
        origin_lng
      ]
    );

    res.status(201).json({ trip: result.rows[0] });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update live location and telemetry
router.put('/:id/location', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const tripId = req.params.id;
  const { current_lat, current_lng, battery_percent, safety_status } = req.body;

  if (current_lat === undefined || current_lng === undefined) {
    return res.status(400).json({ error: 'Coordinates are required' });
  }

  try {
    const result = await query(
      'UPDATE trips SET current_lat = $1, current_lng = $2, battery_percent = $3, safety_status = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [current_lat, current_lng, battery_percent || 100, safety_status || 'safe', tripId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Trip not found or unauthorized' });
    }

    res.json({ trip: result.rows[0] });
  } catch (error) {
    console.error('Update live location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log a deviation (Guardian Mode trigger)
router.post('/:id/deviation', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const tripId = req.params.id;
  const { lat, lng, deviation_type, details } = req.body;

  if (lat === undefined || lng === undefined || !deviation_type) {
    return res.status(400).json({ error: 'Telemetry data required' });
  }

  try {
    const result = await query(
      'INSERT INTO deviations (trip_id, lat, lng, deviation_type, details) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tripId, lat, lng, deviation_type, details || '']
    );

    // Set trip safety_status to warning
    await query("UPDATE trips SET safety_status = 'warning' WHERE id = $1", [tripId]);

    res.status(201).json({ deviation: result.rows[0] });
  } catch (error) {
    console.error('Log deviation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete trip
router.put('/:id/complete', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const tripId = req.params.id;

  try {
    const result = await query(
      "UPDATE trips SET status = 'completed', end_time = $1, safety_status = 'safe' WHERE id = $2 AND user_id = $3 RETURNING *",
      [new Date().toISOString(), tripId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Trip not found or unauthorized' });
    }

    res.json({ trip: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
