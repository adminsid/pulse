import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin', 'manager'));

// ─── Users ───────────────────────────────────────────────────────────────────

router.post('/users', async (req: Request, res: Response): Promise<void> => {
  const { email, password, full_name, role } = req.body;
  if (!email || !password || !full_name || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const allowedRoles = ['manager', 'va', 'client'];
  if (!allowedRoles.includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (workspace_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [req.user!.workspace_id, email, password_hash, full_name, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('unique') || message.includes('duplicate')) {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user', detail: message });
    }
  }
});

router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM users WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [req.user!.workspace_id]
    );
    res.json(result.rows);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const { full_name, role, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         role = COALESCE($2, role),
         is_active = COALESCE($3, is_active)
       WHERE id = $4 AND workspace_id = $5
       RETURNING id, email, full_name, role, is_active`,
      [full_name, role, is_active, req.params.id, req.user!.workspace_id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = FALSE
       WHERE id = $1 AND workspace_id = $2
       RETURNING id`,
      [req.params.id, req.user!.workspace_id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'User deactivated' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// ─── Clients ─────────────────────────────────────────────────────────────────

router.post('/clients', async (req: Request, res: Response): Promise<void> => {
  const { name, contact_email } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO clients (workspace_id, name, contact_email)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user!.workspace_id, name, contact_email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

router.get('/clients', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM clients WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [req.user!.workspace_id]
    );
    res.json(result.rows);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to list clients' });
  }
});

// ─── Projects ────────────────────────────────────────────────────────────────

router.post('/projects', async (req: Request, res: Response): Promise<void> => {
  const { name, description, client_id } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO projects (workspace_id, client_id, name, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user!.workspace_id, client_id || null, name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.workspace_id = $1
       ORDER BY p.created_at DESC`,
      [req.user!.workspace_id]
    );
    res.json(result.rows);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// ─── Project Members ─────────────────────────────────────────────────────────

router.post('/projects/:id/members', async (req: Request, res: Response): Promise<void> => {
  const { user_id, role } = req.body;
  if (!user_id || !role) {
    res.status(400).json({ error: 'user_id and role are required' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [req.params.id, user_id, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.get('/projects/:id/members', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT pm.*, u.email, u.full_name
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to list members' });
  }
});

router.delete('/projects/:id/members/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ─── Integrations ────────────────────────────────────────────────────────────

router.post('/integrations', async (req: Request, res: Response): Promise<void> => {
  const { provider, access_token_enc, refresh_token_enc, token_expires_at, metadata } = req.body;
  if (!provider) {
    res.status(400).json({ error: 'Provider is required' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO integrations
         (workspace_id, provider, access_token_enc, refresh_token_enc, token_expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        req.user!.workspace_id,
        provider,
        access_token_enc || null,
        refresh_token_enc || null,
        token_expires_at || null,
        metadata ? JSON.stringify(metadata) : '{}',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to save integration' });
  }
});

router.get('/integrations', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, provider, is_active, metadata, token_expires_at, created_at
       FROM integrations WHERE workspace_id = $1`,
      [req.user!.workspace_id]
    );
    res.json(result.rows);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

export default router;
