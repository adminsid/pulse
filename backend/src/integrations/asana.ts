import { ConnectorInterface, ExternalContainer, ExternalTask } from './interface';

const ASANA_BASE = 'https://app.asana.com/api/1.0';

async function asanaFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${ASANA_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Asana API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface AsanaProject {
  gid: string;
  name: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  due_on: string | null;
  assignee: { email: string } | null;
  custom_fields?: { name: string; display_value: string | null }[];
  liked?: boolean;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

function asanaStatusToPulse(task: AsanaTask): string {
  if (task.completed) return 'done';
  // Check for custom field "Status" or tags
  const statusField = task.custom_fields?.find(
    (f) => f.name.toLowerCase() === 'status' || f.name.toLowerCase() === 'stage'
  );
  if (statusField?.display_value) {
    const v = statusField.display_value.toLowerCase();
    if (v.includes('block')) return 'blocked';
    if (v.includes('progress') || v.includes('doing')) return 'in_progress';
    if (v.includes('done') || v.includes('complete')) return 'done';
  }
  return 'todo';
}

export class AsanaConnector implements ConnectorInterface {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Lists Asana workspaces (used as "containers" when no project is selected)
   * and then all projects across them.
   */
  async listContainers(): Promise<ExternalContainer[]> {
    try {
      // Get workspaces
      const wsData = await asanaFetch<{ data: AsanaWorkspace[] }>(
        '/workspaces?opt_fields=gid,name',
        this.accessToken
      );

      const containers: ExternalContainer[] = [];
      for (const ws of wsData.data) {
        // Get projects in each workspace
        const projData = await asanaFetch<{ data: AsanaProject[] }>(
          `/projects?workspace=${ws.gid}&opt_fields=gid,name&archived=false`,
          this.accessToken
        );
        for (const p of projData.data) {
          containers.push({ id: p.gid, name: `${ws.name} / ${p.name}` });
        }
      }
      return containers;
    } catch (err) {
      console.error('[asana] listContainers error:', err);
      throw err;
    }
  }

  /**
   * Fetches all tasks in an Asana project (containerId = project GID).
   */
  async listTasks(containerId: string): Promise<ExternalTask[]> {
    try {
      const data = await asanaFetch<{ data: AsanaTask[] }>(
        `/projects/${containerId}/tasks?opt_fields=gid,name,notes,completed,due_on,assignee.email,custom_fields.name,custom_fields.display_value&limit=100`,
        this.accessToken
      );

      return data.data.map((t) => ({
        id: t.gid,
        title: t.name,
        description: t.notes || undefined,
        status: asanaStatusToPulse(t),
        assigneeEmail: t.assignee?.email || undefined,
        dueDate: t.due_on || undefined,
        priority: 'medium', // Asana doesn't have native priority; use custom field if available
      }));
    } catch (err) {
      console.error(`[asana] listTasks error for project ${containerId}:`, err);
      throw err;
    }
  }

  /**
   * Creates or updates a task in Asana (write-back).
   */
  async upsertTask(task: ExternalTask): Promise<void> {
    try {
      if (task.id) {
        // Update existing
        await asanaFetch(`/tasks/${task.id}`, this.accessToken, {
          method: 'PUT',
          body: JSON.stringify({
            data: {
              name: task.title,
              notes: task.description || '',
              completed: task.status === 'done',
              due_on: task.dueDate || null,
            },
          }),
        });
      }
    } catch (err) {
      console.error(`[asana] upsertTask error for task ${task.id}:`, err);
      throw err;
    }
  }

  /**
   * Sets the completion status of an Asana task.
   */
  async setStatus(externalTaskId: string, status: string): Promise<void> {
    try {
      const completed = status === 'done';
      await asanaFetch(`/tasks/${externalTaskId}`, this.accessToken, {
        method: 'PUT',
        body: JSON.stringify({ data: { completed } }),
      });
    } catch (err) {
      console.error(`[asana] setStatus error for task ${externalTaskId}:`, err);
      throw err;
    }
  }

  /**
   * Adds a story/comment to an Asana task.
   */
  async addComment(externalTaskId: string, comment: string): Promise<void> {
    try {
      await asanaFetch(`/tasks/${externalTaskId}/stories`, this.accessToken, {
        method: 'POST',
        body: JSON.stringify({ data: { text: comment } }),
      });
    } catch (err) {
      console.error(`[asana] addComment error for task ${externalTaskId}:`, err);
      throw err;
    }
  }
}
