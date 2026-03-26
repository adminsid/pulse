import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';

const router = Router();

router.use(requireAuth);

// GET /api/projects/:id — role-filtered
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, workspace_id, id: userId } = req.user!;

    let result;
    if (role === 'admin' || role === 'manager') {
      result = await pool.query(
        `SELECT p.*, c.name AS client_name
         FROM projects p LEFT JOIN clients c ON c.id = p.client_id
         WHERE p.id = $1 AND p.workspace_id = $2`,
        [req.params.id, workspace_id]
      );
    } else {
      result = await pool.query(
        `SELECT p.*, c.name AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id
         JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
         WHERE p.id = $1 AND p.workspace_id = $3`,
        [req.params.id, userId, workspace_id]
      );
    }

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// PUT /api/projects/:id/sor — admin/manager only
router.put('/:id/sor', requireRole('admin', 'manager'), async (req: Request, res: Response): Promise<void> => {
  const { sor_provider, sor_container_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE projects SET sor_provider = $1, sor_container_id = $2
       WHERE id = $3 AND workspace_id = $4 RETURNING *`,
      [sor_provider, sor_container_id, req.params.id, req.user!.workspace_id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update SoR' });
  }
});

// GET /api/projects/:id/status-mappings
router.get('/:id/status-mappings', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM project_status_mappings WHERE project_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to get status mappings' });
  }
});

// PUT /api/projects/:id/status-mappings — upsert
router.put('/:id/status-mappings', requireRole('admin', 'manager'), async (req: Request, res: Response): Promise<void> => {
  const { mappings } = req.body as { mappings: { pulse_status: string; external_status: string }[] };
  if (!Array.isArray(mappings)) {
    res.status(400).json({ error: 'mappings must be an array' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const m of mappings) {
      await client.query(
        `INSERT INTO project_status_mappings (project_id, pulse_status, external_status)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, pulse_status) DO UPDATE SET external_status = $3`,
        [req.params.id, m.pulse_status, m.external_status]
      );
    }
    await client.query('COMMIT');
    const result = await pool.query(
      `SELECT * FROM project_status_mappings WHERE project_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to upsert status mappings' });
  } finally {
    client.release();
  }
});

// POST /api/projects/:id/sync — trigger sync stub
router.post('/:id/sync', requireRole('admin', 'manager'), async (req: Request, res: Response): Promise<void> => {
  // Stub: actual sync is handled by the background job
  res.json({ message: 'Sync triggered', project_id: req.params.id });
});

export default router;
