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

interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  due_on: string | null;
  assignee: { gid: string; name: string; email: string } | null;
  custom_fields?: { name: string; display_value: string | null }[];
}

interface AsanaProject {
  gid: string;
  name: string;
  archived: boolean;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

function asanaStatusToPulse(task: AsanaTask): string {
  if (task.completed) return 'done';
  
  // Custom field "Status" mapping (verified from live API: "On track", "At risk", "Off track")
  const statusField = task.custom_fields?.find(
    (f) => f.name.toLowerCase() === 'status' || f.name.toLowerCase() === 'stage'
  );

  if (statusField?.display_value) {
    const v = statusField.display_value.toLowerCase();
    if (v.includes('off track') || v.includes('block')) return 'blocked';
    if (v.includes('at risk') || v.includes('progress') || v.includes('doing')) return 'in_progress';
    if (v.includes('on track')) return 'todo'; // "On track" is the default healthy todo state
  }
  
  return 'todo';
}

function asanaPriorityToPulse(task: AsanaTask): string {
  const priorityField = task.custom_fields?.find(f => f.name.toLowerCase() === 'priority');
  if (priorityField?.display_value) {
    const p = priorityField.display_value.toLowerCase();
    if (p.includes('high') || p.includes('urgent')) return 'high';
    if (p.includes('low')) return 'low';
  }
  return 'medium';
}

export class AsanaConnector implements ConnectorInterface {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async listContainers(): Promise<ExternalContainer[]> {
    console.log('[asana] listContainers: fetching workspaces...');
    try {
      const wsData = await asanaFetch<{ data: AsanaWorkspace[] }>(
        '/workspaces?opt_fields=gid,name',
        this.accessToken
      );
      console.log(`[asana] listContainers: found ${wsData.data?.length || 0} workspaces`);

      const containers: ExternalContainer[] = [];
      if (wsData.data) {
        for (const ws of wsData.data) {
          console.log(`[asana] listContainers: fetching projects for workspace ${ws.name} (${ws.gid})...`);
          const projData = await asanaFetch<{ data: AsanaProject[] }>(
            `/projects?workspace=${ws.gid}&opt_fields=gid,name,archived&archived=false`,
            this.accessToken
          );
          console.log(`[asana] listContainers: found ${projData.data?.length || 0} projects in ${ws.name}`);
          for (const p of projData.data) {
            containers.push({ id: p.gid, name: `${ws.name} / ${p.name}` });
          }
        }
      }
      console.log(`[asana] listContainers: returning ${containers.length} total containers`);
      return containers;
    } catch (err) {
      console.error('[asana] listContainers error:', err);
      throw err;
    }
  }

  async listTasks(containerId: string): Promise<ExternalTask[]> {
    try {
      // Endpoint verified via live API testing: project GID is a query param
      const data = await asanaFetch<{ data: AsanaTask[] }>(
        `/tasks?project=${containerId}&opt_fields=gid,name,notes,completed,due_on,assignee.name,assignee.email,custom_fields.name,custom_fields.display_value&limit=100`,
        this.accessToken
      );

      return data.data.map((t) => ({
        id: t.gid,
        title: t.name,
        description: t.notes || undefined,
        status: asanaStatusToPulse(t),
        assigneeEmail: t.assignee?.email || undefined,
        dueDate: t.due_on || undefined,
        priority: asanaPriorityToPulse(t),
      }));
    } catch (err) {
      console.error(`[asana] listTasks error for project ${containerId}:`, err);
      throw err;
    }
  }

  async upsertTask(task: ExternalTask): Promise<void> {
    try {
      if (task.id) {
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

  async setAssignee(externalTaskId: string, email: string): Promise<void> {
    try {
      // Asana allows setting assignee via email in the update task body
      await asanaFetch(`/tasks/${externalTaskId}`, this.accessToken, {
        method: 'PUT',
        body: JSON.stringify({ data: { assignee: email } }),
      });
    } catch (err) {
      console.error(`[asana] setAssignee error for task ${externalTaskId}:`, err);
      // Don't throw if user not found in asana, just log it as Pulse can still have local assignment
    }
  }

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
