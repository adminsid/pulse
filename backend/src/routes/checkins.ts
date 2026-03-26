import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../auth/middleware';

const router = Router();

router.use(requireAuth);

// GET /api/checkins/pending
router.get('/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT c.*, ts.task_id, t.title AS task_title
       FROM checkins c
       JOIN timer_sessions ts ON ts.id = c.timer_session_id
       JOIN tasks t ON t.id = ts.task_id
       WHERE c.user_id = $1 AND c.status = 'pending'
       ORDER BY c.due_at ASC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to get pending checkins' });
  }
});

// POST /api/checkins/:id/respond
router.post('/:id/respond', async (req: Request, res: Response): Promise<void> => {
  const { response_note } = req.body;

  try {
    const result = await pool.query(
      `UPDATE checkins
       SET status = 'responded', responded_at = NOW(), response_note = $1
       WHERE id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [response_note || null, req.params.id, req.user!.id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Checkin not found or already responded' });
      return;
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to respond to checkin' });
  }
});

export default router;
