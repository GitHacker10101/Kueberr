import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import bcrypt from 'bcryptjs';

const router = Router();

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.prepare('INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)').run(id, email, name, hashedPassword);

    const user = { id, email, name };
    // Return a mock token
    res.json({ token: 'mock-jwt-token-' + id, user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token: 'mock-jwt-token-' + user.id, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
