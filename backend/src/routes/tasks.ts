import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';

const router = Router();

router.use(requireAuth);

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', async (req: Request, res: Response): Promise<void> => {
  const { role, id: userId } = req.user!;
  const { status, assignee_user_id } = req.query;

  try {
    let query = `SELECT t.*, u.full_name AS assignee_name
                 FROM tasks t
                 LEFT JOIN users u ON u.id = t.assignee_user_id
                 WHERE t.project_id = $1`;
    const params: unknown[] = [req.params.projectId];

    // VAs only see tasks assigned to them
    if (role === 'va') {
      query += ` AND t.assignee_user_id = $${params.length + 1}`;
      params.push(userId);
    } else if (assignee_user_id) {
      query += ` AND t.assignee_user_id = $${params.length + 1}`;
      params.push(assignee_user_id);
    }

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { role, id: userId, workspace_id } = req.user!;
  try {
    let result;
    if (role === 'admin' || role === 'manager' || role === 'client') {
      result = await pool.query(
        `SELECT t.*, u.full_name AS assignee_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_user_id
         JOIN projects p ON p.id = t.project_id
         WHERE t.id = $1 AND p.workspace_id = $2`,
        [req.params.id, workspace_id]
      );
    } else {
      // VA — only their own tasks
      result = await pool.query(
        `SELECT t.*, u.full_name AS assignee_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_user_id
         WHERE t.id = $1 AND t.assignee_user_id = $2`,
        [req.params.id, userId]
      );
    }

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// PUT /api/tasks/:id/status
router.put('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }
  try {
    const result = await pool.query(
      `UPDATE tasks SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// POST /api/tasks — create task manually
router.post('/', requireRole('admin', 'manager', 'va'), async (req: Request, res: Response): Promise<void> => {
  const { project_id, title, description, assignee_user_id, due_date, priority } = req.body;
  if (!project_id || !title) {
    res.status(400).json({ error: 'project_id and title are required' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, assignee_user_id, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, title, description || null, assignee_user_id || null, due_date || null, priority || 'medium']
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router;
