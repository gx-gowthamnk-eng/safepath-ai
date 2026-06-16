import bcrypt from 'bcryptjs';
import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../lib/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'safepath_super_secret_key_123';

// Register User
router.post('/register', async (req, res) => {
  const { email, password, name, phone, mode, language_pref } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Check if user exists
    const userExist = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rowCount > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const defaultMode = mode || 'standard';
    const defaultLang = language_pref || 'en';
    const role = 'user'; // default role

    const result = await query(
      'INSERT INTO users (email, password_hash, name, phone, role, mode, language_pref) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, name, phone, role, mode, language_pref',
      [email, passwordHash, name, phone || '', role, defaultMode, defaultLang]
    );

    const newUser = result.rows[0];
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: newUser });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        mode: user.mode,
        language_pref: user.language_pref,
        emergency_pin: user.emergency_pin
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User Profile
router.get('/profile', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await query('SELECT id, email, name, phone, role, mode, language_pref, emergency_pin FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User Mode
router.put('/mode', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { mode } = req.body;

  if (!mode || !['standard', 'child', 'senior'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode specified' });
  }

  try {
    const result = await query('UPDATE users SET mode = $1 WHERE id = $2 RETURNING id, email, name, role, mode, language_pref', [mode, req.user.id]);
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
