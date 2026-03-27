import cron from 'node-cron';
import pool from '../db';
import { AsanaConnector } from '../integrations/asana';
import type { ExternalTask } from '../integrations/interface';

export function startSyncJob(): void {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runSync();
    } catch (err) {
      console.error('Sync job error:', err);
    }
  });

  console.log('Sync job started (every 5 min)');
}

export async function runSync(): Promise<void> {
  const result = await pool.query(`
    SELECT
      pi.id AS project_integration_id,
      pi.project_id,
      pi.external_container_id,
      pi.sync_enabled,
      i.provider,
      i.access_token_enc,
      i.metadata
    FROM project_integrations pi
    JOIN integrations i ON i.id = pi.integration_id
    JOIN projects p ON p.id = pi.project_id
    WHERE pi.sync_enabled = TRUE AND i.is_active = TRUE AND p.status = 'active'
  `);

  for (const row of result.rows) {
    try {
      console.log(
        `[sync] project_integration=${row.project_integration_id} provider=${row.provider} container=${row.external_container_id}`
      );

      const connector = buildConnector(row.provider, row.access_token_enc);
      if (!connector) {
        console.warn(`[sync] No connector for provider: ${row.provider}`);
        continue;
      }

      const tasks = await connector.listTasks(row.external_container_id);
      await upsertTasks(row.project_id, tasks);

      await pool.query(
        `UPDATE project_integrations SET last_synced_at = NOW() WHERE id = $1`,
        [row.project_integration_id]
      );

      console.log(`[sync] Synced ${tasks.length} tasks for project ${row.project_id}`);
    } catch (err) {
      console.error(`[sync] Error for project_integration ${row.project_integration_id}:`, err);
    }
  }
}

function buildConnector(provider: string, accessToken: string) {
  switch (provider) {
    case 'asana':
      return new AsanaConnector(accessToken);
    default:
      return null;
  }
}

async function upsertTasks(projectId: string, tasks: ExternalTask[]): Promise<void> {
  for (const task of tasks) {
    if (!task.title) continue;

    // Resolve assignee by email if provided
    let assigneeUserId: string | null = null;
    if (task.assigneeEmail) {
      const userRes = await pool.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [task.assigneeEmail]
      );
      if (userRes.rows[0]) {
        assigneeUserId = userRes.rows[0].id as string;
      }
    }

    // Map external status to Pulse status
    const pulseStatus = mapStatus(task.status);
    const priority = task.priority || 'medium';
    const dueDate = task.dueDate || null;

    await pool.query(
      `INSERT INTO tasks
         (project_id, external_id, title, description, status, assignee_user_id, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (project_id, external_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         assignee_user_id = COALESCE(EXCLUDED.assignee_user_id, tasks.assignee_user_id),
         due_date = EXCLUDED.due_date,
         priority = EXCLUDED.priority,
         updated_at = NOW()`,
      [projectId, task.id, task.title, task.description || null, pulseStatus, assigneeUserId, dueDate, priority]
    );
  }
}

function mapStatus(externalStatus: string): string {
  const s = externalStatus.toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'finished') return 'done';
  if (s === 'in_progress' || s === 'doing' || s === 'in progress') return 'in_progress';
  if (s === 'blocked') return 'blocked';
  if (s === 'canceled' || s === 'cancelled') return 'canceled';
  return 'todo';
}
