import { Router, Request, Response } from 'express';
import { PoolClient } from 'pg';
import pool from '../db';
import { requireAuth } from '../auth/middleware';
import { broadcast } from '../websocket/server';

const router = Router();

router.use(requireAuth);

/** Seconds of active work since the last start/resume (not counting any paused time). */
function activeElapsed(startedAt: Date, resumedAt: Date | null, pausedAt: Date | null): number {
  const segmentStart = resumedAt ? resumedAt : startedAt;
  const segmentEnd = pausedAt ? pausedAt : new Date();
  return Math.max(0, Math.floor((segmentEnd.getTime() - new Date(segmentStart).getTime()) / 1000));
}

/** Stop a session in-progress (used by start and stop routes). */
async function finalizeSession(
  dbClient: PoolClient,
  session: Record<string, unknown>,
  userId: string
): Promise<void> {
  const state = session.state as string;
  let elapsed = 0;
  if (state === 'running') {
    elapsed = activeElapsed(
      session.started_at as Date,
      session.resumed_at as Date | null,
      null
    );
  }
  // If paused, elapsed was already accumulated into total_seconds on pause — add 0.
  const total = ((session.total_seconds as number) || 0) + elapsed;

  await dbClient.query(
    `UPDATE timer_sessions SET state = 'stopped', stopped_at = NOW(), total_seconds = $1 WHERE id = $2`,
    [total, session.id]
  );

  if (elapsed > 0) {
    await dbClient.query(
      `INSERT INTO time_entries (timer_session_id, task_id, user_id, started_at, ended_at, seconds)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [
        session.id,
        session.task_id,
        userId,
        session.resumed_at || session.started_at,
        elapsed,
      ]
    );

    await dbClient.query(
      `UPDATE tasks SET tracked_seconds = tracked_seconds + $1, last_worked_at = NOW() WHERE id = $2`,
      [elapsed, session.task_id]
    );
  }
}

// POST /api/timer/start
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  const { task_id } = req.body;
  if (!task_id) {
    res.status(400).json({ error: 'task_id is required' });
    return;
  }

  const userId = req.user!.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Stop any currently running or paused timer for this user
    const running = await client.query(
      `SELECT * FROM timer_sessions WHERE user_id = $1 AND state IN ('running','paused')`,
      [userId]
    );

    for (const session of running.rows) {
      await finalizeSession(client, session, userId);
    }

    // Start new timer
    const sessionResult = await client.query(
      `INSERT INTO timer_sessions (task_id, user_id, state)
       VALUES ($1, $2, 'running') RETURNING *`,
      [task_id, userId]
    );
    const session = sessionResult.rows[0];

    await client.query('COMMIT');

    broadcast(userId, { type: 'timer_state_changed', data: session });
    res.status(201).json(session);
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to start timer', detail: message });
  } finally {
    client.release();
  }
});

// POST /api/timer/pause
router.post('/pause', async (req: Request, res: Response): Promise<void> => {
  const { pause_reason } = req.body;
  const userId = req.user!.id;

  try {
    // Accumulate the active elapsed seconds into total_seconds at pause time
    const result = await pool.query(
      `UPDATE timer_sessions
       SET state = 'paused',
           paused_at = NOW(),
           pause_reason = $1,
           total_seconds = total_seconds +
             GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(resumed_at, started_at)))::INT)
       WHERE user_id = $2 AND state = 'running'
       RETURNING *`,
      [pause_reason || null, userId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'No running timer found' });
      return;
    }

    broadcast(userId, { type: 'timer_state_changed', data: result.rows[0] });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to pause timer' });
  }
});

// POST /api/timer/resume
router.post('/resume', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    // Simply restart the active segment — total_seconds was already updated on pause
    const result = await pool.query(
      `UPDATE timer_sessions
       SET state = 'running', resumed_at = NOW(), paused_at = NULL, pause_reason = NULL
       WHERE user_id = $1 AND state = 'paused'
       RETURNING *`,
      [userId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'No paused timer found' });
      return;
    }

    broadcast(userId, { type: 'timer_state_changed', data: result.rows[0] });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to resume timer' });
  }
});

// POST /api/timer/stop
router.post('/stop', async (req: Request, res: Response): Promise<void> => {
  const { note } = req.body;
  const userId = req.user!.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT * FROM timer_sessions WHERE user_id = $1 AND state IN ('running','paused')`,
      [userId]
    );

    if (!current.rows[0]) {
      res.status(404).json({ error: 'No active timer found' });
      return;
    }

    const session = current.rows[0];
    const state = session.state as string;
    let elapsed = 0;
    if (state === 'running') {
      elapsed = activeElapsed(session.started_at, session.resumed_at, null);
    }
    const total = (session.total_seconds || 0) + elapsed;

    const sessionResult = await client.query(
      `UPDATE timer_sessions SET state = 'stopped', stopped_at = NOW(), total_seconds = $1
       WHERE id = $2 RETURNING *`,
      [total, session.id]
    );

    const entryResult = await client.query(
      `INSERT INTO time_entries (timer_session_id, task_id, user_id, started_at, ended_at, seconds, note)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *`,
      [
        session.id,
        session.task_id,
        userId,
        session.resumed_at || session.started_at,
        elapsed,
        note || null,
      ]
    );

    if (elapsed > 0) {
      await client.query(
        `UPDATE tasks SET tracked_seconds = tracked_seconds + $1, last_worked_at = NOW() WHERE id = $2`,
        [elapsed, session.task_id]
      );
    }

    await client.query('COMMIT');

    broadcast(userId, { type: 'timer_state_changed', data: sessionResult.rows[0] });
    res.json({ session: sessionResult.rows[0], time_entry: entryResult.rows[0] });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to stop timer' });
  } finally {
    client.release();
  }
});

// GET /api/timer/current
router.get('/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT ts.*, t.title AS task_title
       FROM timer_sessions ts
       JOIN tasks t ON t.id = ts.task_id
       WHERE ts.user_id = $1 AND ts.state IN ('running','paused')
       ORDER BY ts.started_at DESC LIMIT 1`,
      [req.user!.id]
    );
    res.json(result.rows[0] || null);
  } catch {
    res.status(500).json({ error: 'Failed to get current timer' });
  }
});

export default router;

