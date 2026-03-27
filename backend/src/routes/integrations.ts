import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../auth/middleware';
import { AsanaConnector } from '../integrations/asana';
import { runSync } from '../jobs/sync';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin', 'manager'));

/**
 * GET /api/integrations/:integrationId/containers
 * Lists all containers (Asana projects) for the given integration.
 * Used to let admins pick which Asana project to link.
 */
router.get('/:integrationId/containers', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, provider, access_token_enc FROM integrations
       WHERE id = $1 AND workspace_id = $2 AND is_active = TRUE`,
      [req.params.integrationId, req.user!.workspace_id]
    );
    const integration = result.rows[0];
    console.log(`[integrations] listContainers for ${req.params.integrationId}: found in DB? ${!!integration}`);
    
    if (!integration) {
      console.warn(`[integrations] Integration ${req.params.integrationId} NOT FOUND or NOT ACTIVE for workspace ${req.user!.workspace_id}`);
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    if (!integration.access_token_enc) {
      res.status(400).json({ error: 'Integration has no access token' });
      return;
    }

    let containers: { id: string; name: string }[] = [];
    if (integration.provider === 'asana') {
      const connector = new AsanaConnector(integration.access_token_enc as string);
      containers = await connector.listContainers();
    } else {
      res.status(400).json({ error: `Container listing not supported for ${integration.provider}` });
      return;
    }

    res.json(containers);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list containers';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/integrations/link
 * Links an integration to a project (creates a project_integrations row)
 * and immediately triggers the first sync.
 * Body: { integration_id, project_id, external_container_id }
 */
router.post('/link', async (req: Request, res: Response): Promise<void> => {
  const { integration_id, project_id, external_container_id } = req.body;

  if (!integration_id || !project_id || !external_container_id) {
    res.status(400).json({ error: 'integration_id, project_id, and external_container_id are required' });
    return;
  }

  try {
    // Verify project belongs to workspace
    const projCheck = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND workspace_id = $2`,
      [project_id, req.user!.workspace_id]
    );
    if (!projCheck.rows[0]) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Verify integration belongs to workspace
    const intCheck = await pool.query(
      `SELECT id, provider FROM integrations WHERE id = $1 AND workspace_id = $2`,
      [integration_id, req.user!.workspace_id]
    );
    if (!intCheck.rows[0]) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    // Upsert project_integrations row
    const linkResult = await pool.query(
      `INSERT INTO project_integrations (project_id, integration_id, external_container_id, sync_enabled)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (project_id, integration_id) DO UPDATE SET
         external_container_id = EXCLUDED.external_container_id,
         sync_enabled = TRUE
       RETURNING *`,
      [project_id, integration_id, external_container_id]
    );

    // Update project sor_provider + sor_container_id
    await pool.query(
      `UPDATE projects SET sor_provider = $1, sor_container_id = $2 WHERE id = $3`,
      [intCheck.rows[0].provider, external_container_id, project_id]
    );

    // Trigger immediate sync in background
    runSync().catch((err) => console.error('[link] Immediate sync failed:', err));

    res.status(201).json({
      project_integration: linkResult.rows[0],
      message: 'Linked successfully. Sync is running in the background.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to link';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/integrations/projects/:projectId/sync
 * Triggers an immediate sync for a specific project.
 */
router.post('/projects/:projectId/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify project belongs to workspace
    const projCheck = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND workspace_id = $2`,
      [req.params.projectId, req.user!.workspace_id]
    );
    if (!projCheck.rows[0]) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    runSync().catch((err) => console.error('[manual-sync] Error:', err));
    res.json({ message: 'Sync triggered', project_id: req.params.projectId });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

export default router;
