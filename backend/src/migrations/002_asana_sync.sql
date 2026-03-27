-- 002_asana_sync.sql
-- Adds unique constraint for external task upsert and indexes for query performance

-- Unique constraint so ON CONFLICT (project_id, external_id) works
ALTER TABLE tasks ADD CONSTRAINT tasks_project_external_unique UNIQUE (project_id, external_id);

-- Unique constraint so ON CONFLICT (project_id, integration_id) works in link route
ALTER TABLE project_integrations ADD CONSTRAINT project_integrations_project_intg_unique UNIQUE (project_id, integration_id);

-- Index for tasks/mine query
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);

-- Index for project_integrations sync loop
CREATE INDEX IF NOT EXISTS idx_project_integrations_enabled ON project_integrations (sync_enabled, integration_id);
