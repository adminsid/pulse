import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';

const router = Router();

router.use(requireAuth);

// GET /api/projects/:projectId/goals
router.get('/projects/:projectId/goals', async (req: Request, res: Response): Promise<void> => {
  const { workspace_id } = req.user!;
  const { projectId } = req.params;

  try {
    // Progress calculation based on count of tasks (status='done') vs total tasks in goal
    const result = await pool.query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id) AS total_tasks,
              (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id AND t.status = 'done') AS completed_tasks,
              (SELECT SUM(t.tracked_seconds) FROM tasks t WHERE t.goal_id = g.id) AS tracked_seconds
       FROM goals g
       JOIN projects p ON p.id = g.project_id
       WHERE g.project_id = $1 AND p.workspace_id = $2
       ORDER BY g.created_at DESC`,
      [projectId, workspace_id]
    );

    const goals = result.rows.map(g => ({
      ...g,
      total_tasks: parseInt(g.total_tasks, 10),
      completed_tasks: parseInt(g.completed_tasks, 10),
      tracked_seconds: parseInt(g.tracked_seconds || '0', 10),
      progress: g.total_tasks > 0 ? Math.round((parseInt(g.completed_tasks, 10) / parseInt(g.total_tasks, 10)) * 100) : 0
    }));

    res.json(goals);
  } catch (err) {
    console.error('Failed to list goals:', err);
    res.status(500).json({ error: 'Failed to list goals' });
  }
});

// POST /api/goals
router.post('/goals', requireRole('admin', 'manager'), async (req: Request, res: Response): Promise<void> => {
  const { project_id, title, description, color, deadline } = req.body;
  if (!project_id || !title) {
    res.status(400).json({ error: 'project_id and title are required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO goals (project_id, title, description, color, deadline)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project_id, title, description || null, color || null, deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create goal:', err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /api/goals/:id
router.post('/goals/:id', requireRole('admin', 'manager'), async (req: Request, res: Response): Promise<void> => {
    const { title, description, color, deadline, status } = req.body;
    try {
      const result = await pool.query(
        `UPDATE goals SET title = COALESCE($1, title), description = COALESCE($2, description), 
                         color = COALESCE($3, color), deadline = COALESCE($4, deadline), 
                         status = COALESCE($5, status), updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [title, description, color, deadline, status, req.params.id]
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Failed to update goal:', err);
      res.status(500).json({ error: 'Failed to update goal' });
    }
});

export default router;
