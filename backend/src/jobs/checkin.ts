import cron from 'node-cron';
import pool from '../db';
import { broadcast } from '../websocket/server';

export function startCheckinJob(): void {
  // Runs every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await processCheckins();
    } catch (err) {
      console.error('Checkin job error:', err);
    }
  });

  console.log('Checkin job started (every 30s)');
}

async function processCheckins(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all running timer sessions with their workspace settings
    const runningSessions = await client.query(`
      SELECT
        ts.id AS session_id,
        ts.task_id,
        ts.user_id,
        ts.started_at,
        ts.resumed_at,
        w.checkin_interval_minutes,
        w.checkin_response_window_seconds,
        w.id AS workspace_id
      FROM timer_sessions ts
      JOIN tasks t ON t.id = ts.task_id
      JOIN projects p ON p.id = t.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE ts.state = 'running'
    `);

    for (const session of runningSessions.rows) {
      const {
        session_id,
        task_id,
        user_id,
        started_at,
        resumed_at,
        checkin_interval_minutes,
        checkin_response_window_seconds,
      } = session;

      const activeFrom: Date = resumed_at || started_at;
      const now = new Date();
      const elapsedMinutes = (now.getTime() - new Date(activeFrom).getTime()) / 60000;

      if (elapsedMinutes < checkin_interval_minutes) continue;

      // Check if there's already a pending checkin for this session
      const existingPending = await client.query(
        `SELECT id FROM checkins
         WHERE timer_session_id = $1 AND status = 'pending'`,
        [session_id]
      );

      if (existingPending.rows.length > 0) continue;

      // Check last responded checkin time
      const lastCheckin = await client.query(
        `SELECT responded_at, created_at FROM checkins
         WHERE timer_session_id = $1 AND status = 'responded'
         ORDER BY created_at DESC LIMIT 1`,
        [session_id]
      );

      if (lastCheckin.rows.length > 0) {
        const lastTime = new Date(lastCheckin.rows[0].responded_at || lastCheckin.rows[0].created_at);
        const minutesSinceLast = (now.getTime() - lastTime.getTime()) / 60000;
        if (minutesSinceLast < checkin_interval_minutes) continue;
      }

      // Create a new checkin
      const dueAt = new Date(now.getTime() + checkin_response_window_seconds * 1000);
      const checkin = await client.query(
        `INSERT INTO checkins (timer_session_id, user_id, due_at)
         VALUES ($1, $2, $3) RETURNING *`,
        [session_id, user_id, dueAt]
      );

      broadcast(user_id, { type: 'checkin_due', data: { ...checkin.rows[0], task_id } });
    }

    // Find missed checkins (pending and past the response window)
    const missedCheckins = await client.query(`
      SELECT
        c.id AS checkin_id,
        c.timer_session_id,
        c.user_id
      FROM checkins c
      WHERE c.status = 'pending' AND c.due_at < NOW()
    `);

    for (const missed of missedCheckins.rows) {
      const { checkin_id, timer_session_id, user_id } = missed;

      // Mark checkin as auto_paused
      await client.query(
        `UPDATE checkins SET status = 'auto_paused' WHERE id = $1`,
        [checkin_id]
      );

      // Pause the timer
      const sessionResult = await client.query(
        `UPDATE timer_sessions
         SET state = 'paused', paused_at = NOW(), pause_reason = 'auto_paused_checkin_missed'
         WHERE id = $1 AND state = 'running'
         RETURNING *`,
        [timer_session_id]
      );

      if (sessionResult.rows.length > 0) {
        broadcast(user_id, {
          type: 'timer_state_changed',
          data: sessionResult.rows[0],
        });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
