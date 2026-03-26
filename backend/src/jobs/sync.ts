import cron from 'node-cron';
import pool from '../db';

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

async function runSync(): Promise<void> {
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

      // TODO: instantiate appropriate connector based on row.provider and call listTasks()
      // Example:
      // const connector = buildConnector(row.provider, row.access_token_enc);
      // const tasks = await connector.listTasks(row.external_container_id);
      // await upsertTasks(row.project_id, tasks);

      await pool.query(
        `UPDATE project_integrations SET last_synced_at = NOW() WHERE id = $1`,
        [row.project_integration_id]
      );
    } catch (err) {
      console.error(`[sync] Error for project_integration ${row.project_integration_id}:`, err);
    }
  }
}
