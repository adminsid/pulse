import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { signToken } from '../auth/jwt';

const router = Router();

// POST /api/auth/register — creates a new workspace + admin user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, full_name, workspace_name, workspace_slug } = req.body;

  if (!email || !password || !full_name || !workspace_name || !workspace_slug) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING *`,
      [workspace_name, workspace_slug]
    );
    const workspace = workspaceResult.rows[0];

    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (workspace_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id, email, full_name, role, workspace_id`,
      [workspace.id, email, password_hash, full_name]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      workspace_id: user.workspace_id,
    });

    res.status(201).json({ token, user, workspace });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('unique') || message.includes('duplicate')) {
      res.status(409).json({ error: 'Email or workspace slug already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed', detail: message });
    }
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, workspace_id, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      workspace_id: user.workspace_id,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        workspace_id: user.workspace_id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Login failed', detail: message });
  }
});

export default router;
