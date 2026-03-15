import { Router } from 'express';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import bcrypt from 'bcryptjs';
import { setResponseMeta } from '../middleware/responseMeta';

const router = Router();

const issueSessionToken = (userId: string): string => {
  const token = randomBytes(32).toString('hex');
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(id, userId, token, expiresAt);
  return token;
};

// Sign up
router.post('/signup', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'auth:users', quality_status: 'ok' });
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.prepare('INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)').run(id, email, name, hashedPassword);

    const user = { id, email, name };
    const token = issueSessionToken(id);
    res.json({ token, user });
    return;
  } catch (error) {
    console.error('Signup error:', error);
    setResponseMeta(res, { data_source: 'auth:users', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

// Login
router.post('/login', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'auth:users', quality_status: 'ok' });
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Missing credentials' });
      return;
    }

    const user = db.prepare('SELECT id, email, name, password FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = issueSessionToken(user.id);
    res.json({ token, user: userWithoutPassword });
    return;
  } catch (error) {
    console.error('Login error:', error);
    setResponseMeta(res, { data_source: 'auth:users', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

router.post('/reset', (_req, res) => {
  setResponseMeta(res, { data_source: 'auth:users', quality_status: 'unavailable' });
  res.status(503).json({ error: 'Password reset email provider is not configured' });
});

export default router;
