import pool from './db';
import { runSync } from './jobs/sync';

async function testAsanaSync() {
  const PAT = '2/1213826019787400/1213824741137784:d4cd43d80b29719da59a15d9470368b5';
  const ASANA_PROJECT_GID = '1213824522502317';
  const PULSE_PROJECT_ID = 'd1508ad9-6ef0-44fb-91e3-12f715b6f4a0';
  const WORKSPACE_ID = 'c864ec75-437b-4499-abc7-d829a8f94c45';

  try {
    console.log('--- Setting up test integration ---');
    const intResult = await pool.query(
      `INSERT INTO integrations (workspace_id, provider, access_token_enc, is_active)
       VALUES ($1, 'asana', $2, TRUE)
       ON CONFLICT (id) DO UPDATE SET access_token_enc = $2, is_active = TRUE
       RETURNING id`,
      [WORKSPACE_ID, PAT]
    );
    const integrationId = intResult.rows[0].id;

    console.log('--- Linking project to integration ---');
    await pool.query(
      `INSERT INTO project_integrations (project_id, integration_id, external_container_id, sync_enabled)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (project_id, integration_id) DO UPDATE SET external_container_id = $3, sync_enabled = TRUE`,
      [PULSE_PROJECT_ID, integrationId, ASANA_PROJECT_GID]
    );

    console.log('--- Triggering Sync ---');
    await runSync();

    console.log('--- Checking synced tasks ---');
    const tasks = await pool.query(
      `SELECT id, title, status, assignee_user_id, external_id FROM tasks WHERE project_id = $1`,
      [PULSE_PROJECT_ID]
    );
    console.log(`Found ${tasks.rows.length} tasks:`);
    console.table(tasks.rows);

  } catch (err) {
    console.error('Error during test sync:', err);
  } finally {
    await pool.end();
  }
}

testAsanaSync();
