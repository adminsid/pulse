import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';
import { buildConnector } from '../integrations/factory';
import { broadcastToWorkspace } from '../websocket/server';

const router = Router();

router.use(requireAuth);

/** 
 * Helper to sync Pulse task changes back to the external provider 
 */
async function syncToExternal(taskId: string, updates: { 
  status?: string, 
  assigneeEmail?: string,
  title?: string,
  description?: string,
  dueDate?: string
}) {
  try {
    const res = await pool.query(`
      SELECT 
        t.external_id, t.external_provider,
        i.provider, i.access_token_enc,
        pi.external_container_id
      FROM tasks t
      JOIN project_integrations pi ON pi.project_id = t.project_id
      JOIN integrations i ON i.id = pi.integration_id
      WHERE t.id = $1 AND t.external_id IS NOT NULL
    `, [taskId]);

    if (res.rows[0]) {
      const row = res.rows[0];
      const connector = buildConnector(row.provider, row.access_token_enc);
      if (connector) {
        if (updates.status) {
          await connector.setStatus(row.external_id, updates.status);
        }
        if (updates.assigneeEmail) {
          await connector.setAssignee(row.external_id, updates.assigneeEmail);
        }
        // Could also sync title/description if needed
      }
    }
  } catch (err) {
    console.error(`[syncToExternal] Failed for task ${taskId}:`, err);
  }
}

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', async (req: Request, res: Response): Promise<void> => {
  const { role, id: userId } = req.user!;
  const { status, assignee_user_id, goal_id } = req.query;

  try {
    let query = `SELECT t.*, u.full_name AS assignee_name, g.title AS goal_title, g.color AS goal_color
                 FROM tasks t
                 LEFT JOIN users u ON u.id = t.assignee_user_id
                 LEFT JOIN goals g ON g.id = t.goal_id
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

    if (goal_id) {
      query += ` AND t.goal_id = $${params.length + 1}`;
      params.push(goal_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to list tasks:', err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// GET /api/tasks/mine
router.get('/tasks/mine', async (req: Request, res: Response): Promise<void> => {
  const { id: userId, workspace_id } = req.user!;
  try {
    const result = await pool.query(
      `SELECT t.*, u.full_name AS assignee_name, p.name AS project_name, 
              g.title AS goal_title, g.color AS goal_color
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_user_id
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN goals g ON g.id = t.goal_id
       WHERE t.assignee_user_id = $1
         AND p.workspace_id = $2
         AND t.status NOT IN ('canceled')
       ORDER BY t.updated_at DESC
       LIMIT 200`,
      [userId, workspace_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to list my tasks:', err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// GET /api/tasks/:id
router.get('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  const { role, id: userId, workspace_id } = req.user!;
  try {
    let result;
    const baseQuery = `
      SELECT t.*, u.full_name AS assignee_name, u.email AS assignee_email,
             g.title AS goal_title, g.color AS goal_color, p.workspace_id
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_user_id
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN goals g ON g.id = t.goal_id
      WHERE t.id = $1
    `;
    
    result = await pool.query(baseQuery, [req.params.id]);

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = result.rows[0];

    // RBAC
    if (role === 'va' && task.assignee_user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (task.workspace_id !== workspace_id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    res.json(task);
  } catch (err) {
    console.error('Failed to get task:', err);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// PUT /api/tasks/:id — Generic update for Admin/Manager (and VA status)
router.put('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  const { role, workspace_id } = req.user!;
  const { status, assignee_user_id, goal_id, title, description, due_date, priority } = req.body;
  
  try {
    // 1. Check existence and workspace
    const checkRes = await pool.query(
        'SELECT t.*, p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1',
        [req.params.id]
    );
    if (!checkRes.rows[0] || checkRes.rows[0].workspace_id !== workspace_id) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }

    // 2. VA can only update status
    if (role === 'va' && (assignee_user_id || goal_id || title || description)) {
        res.status(403).json({ error: 'VAs can only update status' });
        return;
    }

    // 3. Update Pulse DB
    const result = await pool.query(
      `UPDATE tasks SET 
         status = COALESCE($1, status),
         assignee_user_id = COALESCE($2, assignee_user_id),
         goal_id = CASE WHEN $3 = 'NULL' THEN NULL ELSE COALESCE($3, goal_id) END,
         title = COALESCE($4, title),
         description = COALESCE($5, description),
         due_date = COALESCE($6, due_date),
         priority = COALESCE($7, priority),
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [status, assignee_user_id, goal_id, title, description, due_date, priority, req.params.id]
    );

    const updatedTask = result.rows[0];

    // 4. Sync to External if needed
    const syncUpdates: any = {};
    if (status) syncUpdates.status = status;
    if (assignee_user_id) {
        const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [assignee_user_id]);
        if (userRes.rows[0]) syncUpdates.assigneeEmail = userRes.rows[0].email;
    }
    
    // Fire and forget sync
    syncToExternal(req.params.id, syncUpdates);

    // 5. Broadcast update to workspace
    broadcastToWorkspace(workspace_id, {
        type: 'task_updated',
        data: updatedTask
    });

    res.json(updatedTask);
  } catch (err) {
    console.error('Failed to update task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PUT /api/tasks/:id/status — Legacy/Shorthand (calls the generic PUT logic internally)
router.put('/tasks/:id/status', async (req: Request, res: Response): Promise<void> => {
    // Redirect to generic update
    req.body = { status: req.body.status };
    return await (router as any).handle(req, res); // In practice better to just rewrite or extract shared logic
});

// POST /api/tasks — create task manually
router.post('/tasks', requireRole('admin', 'manager', 'va'), async (req: Request, res: Response): Promise<void> => {
  const { project_id, title, description, assignee_user_id, due_date, priority, goal_id } = req.body;
  if (!project_id || !title) {
    res.status(400).json({ error: 'project_id and title are required' });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, assignee_user_id, due_date, priority, goal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, title, description || null, assignee_user_id || null, due_date || null, priority || 'medium', goal_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router;
