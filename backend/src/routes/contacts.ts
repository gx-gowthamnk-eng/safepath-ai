import { Router, Response } from 'express';
import { query } from '../lib/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get trusted contacts for authenticated user
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await query('SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ contacts: result.rows });
  } catch (error) {
    console.error('Fetch contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add trusted contact
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, phone, relationship, priority } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }

  try {
    const result = await query(
      'INSERT INTO contacts (user_id, name, phone, relationship, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, phone, relationship || '', priority || 'friend']
    );
    res.status(201).json({ contact: result.rows[0] });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete trusted contact
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const contactId = req.params.id;

  try {
    // Check if the contact belongs to the user
    const checkResult = await query('DELETE FROM contacts WHERE id = $1 AND user_id = $2', [contactId, req.user.id]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Contact not found or not authorized' });
    }
    res.json({ success: true, message: 'Contact successfully deleted' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
