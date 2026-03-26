import { Router, Request, Response } from 'express';
import { stringify } from 'csv-stringify';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin', 'manager', 'client'));

// GET /api/reports/timesheet
router.get('/timesheet', async (req: Request, res: Response): Promise<void> => {
  const { user_id, project_id, date_from, date_to } = req.query;
  const { workspace_id } = req.user!;

  const params: unknown[] = [workspace_id];
  let query = `
    SELECT
      te.id,
      te.started_at,
      te.ended_at,
      te.seconds,
      te.note,
      te.date,
      u.full_name AS user_name,
      u.email AS user_email,
      t.title AS task_title,
      p.name AS project_name,
      c.name AS client_name
    FROM time_entries te
    JOIN users u ON u.id = te.user_id
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.workspace_id = $1
  `;

  if (user_id) {
    params.push(user_id);
    query += ` AND te.user_id = $${params.length}`;
  }
  if (project_id) {
    params.push(project_id);
    query += ` AND p.id = $${params.length}`;
  }
  if (date_from) {
    params.push(date_from);
    query += ` AND te.date >= $${params.length}`;
  }
  if (date_to) {
    params.push(date_to);
    query += ` AND te.date <= $${params.length}`;
  }

  query += ' ORDER BY te.started_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
});

// GET /api/reports/timesheet/export — CSV download
router.get('/timesheet/export', async (req: Request, res: Response): Promise<void> => {
  const { user_id, project_id, date_from, date_to } = req.query;
  const { workspace_id } = req.user!;

  const params: unknown[] = [workspace_id];
  let query = `
    SELECT
      u.full_name AS user_name,
      u.email AS user_email,
      p.name AS project_name,
      c.name AS client_name,
      t.title AS task_title,
      te.date,
      te.started_at,
      te.ended_at,
      te.seconds,
      te.note
    FROM time_entries te
    JOIN users u ON u.id = te.user_id
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.workspace_id = $1
  `;

  if (user_id) { params.push(user_id); query += ` AND te.user_id = $${params.length}`; }
  if (project_id) { params.push(project_id); query += ` AND p.id = $${params.length}`; }
  if (date_from) { params.push(date_from); query += ` AND te.date >= $${params.length}`; }
  if (date_to) { params.push(date_to); query += ` AND te.date <= $${params.length}`; }

  query += ' ORDER BY te.date, te.started_at';

  try {
    const result = await pool.query(query, params);
    const rows = result.rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="timesheet.csv"');

    const columns = [
      'user_name', 'user_email', 'project_name', 'client_name',
      'task_title', 'date', 'started_at', 'ended_at', 'seconds', 'note',
    ];

    stringify(rows, { header: true, columns }, (err, output) => {
      if (err) {
        res.status(500).json({ error: 'CSV generation failed' });
        return;
      }
      res.send(output);
    });
  } catch {
    res.status(500).json({ error: 'Failed to export timesheet' });
  }
});

// GET /api/reports/daily-summary
router.get('/daily-summary', async (req: Request, res: Response): Promise<void> => {
  const { date } = req.query;
  const targetDate = (date as string) || new Date().toISOString().slice(0, 10);
  const { workspace_id } = req.user!;

  try {
    const result = await pool.query(
      `SELECT
         u.full_name AS user_name,
         p.name AS project_name,
         SUM(te.seconds) AS total_seconds,
         COUNT(DISTINCT te.task_id) AS tasks_worked
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       JOIN tasks t ON t.id = te.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id = $1 AND te.date = $2
       GROUP BY u.full_name, p.name
       ORDER BY u.full_name, p.name`,
      [workspace_id, targetDate]
    );
    res.json({ date: targetDate, summary: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to generate daily summary' });
  }
});

// GET /api/reports/live-monitor — real-time snapshot of all active timers
router.get('/live-monitor', async (req: Request, res: Response): Promise<void> => {
  const { workspace_id } = req.user!;

  try {
    const result = await pool.query(
      `SELECT
         ts.id AS session_id,
         ts.state,
         ts.started_at,
         ts.paused_at,
         u.id AS user_id,
         u.full_name AS user_name,
         t.id AS task_id,
         t.title AS task_title,
         p.name AS project_name,
         EXTRACT(EPOCH FROM (NOW() - ts.started_at))::INT AS elapsed_seconds
       FROM timer_sessions ts
       JOIN users u ON u.id = ts.user_id
       JOIN tasks t ON t.id = ts.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id = $1 AND ts.state IN ('running','paused')
       ORDER BY ts.started_at`,
      [workspace_id]
    );
    res.json({ snapshot_at: new Date(), active_timers: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to get live monitor' });
  }
});

// GET /api/reports/compliance — compliance metrics per VA (missed check-ins, last check-in, current status)
router.get('/compliance', async (req: Request, res: Response): Promise<void> => {
  const { workspace_id, role, id: userId } = req.user!;
  const { project_id } = req.query;

  try {
    const params: unknown[] = [workspace_id];
    let projectFilter = '';

    if (role === 'client') {
      // Clients only see VAs working on their assigned projects
      params.push(userId);
      projectFilter = `AND EXISTS (
        SELECT 1 FROM project_members pm2
        JOIN projects p2 ON p2.id = pm2.project_id
        WHERE pm2.user_id = $2 AND p2.id = t.project_id AND p2.workspace_id = $1
      )`;
    }

    if (project_id) {
      params.push(project_id);
      projectFilter += ` AND t.project_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.full_name AS user_name,
         ts.state AS current_status,
         ts.started_at AS session_started_at,
         ts.pause_reason,
         t.title AS current_task,
         p.name AS project_name,
         (
           SELECT COUNT(*)::INT FROM checkins c2
           WHERE c2.user_id = u.id
             AND c2.status = 'missed'
             AND c2.due_at > NOW() - INTERVAL '24 hours'
         ) AS missed_checkins_24h,
         (
           SELECT MAX(c3.responded_at) FROM checkins c3
           WHERE c3.user_id = u.id AND c3.status = 'responded'
         ) AS last_checkin_at
       FROM users u
       JOIN timer_sessions ts ON ts.user_id = u.id AND ts.state IN ('running','paused')
       JOIN tasks t ON t.id = ts.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id = $1
         ${projectFilter}
       ORDER BY u.full_name`,
      params
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to get compliance metrics' });
  }
});

export default router;
