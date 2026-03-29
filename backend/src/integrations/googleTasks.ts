import { ConnectorInterface, ExternalContainer, ExternalTask } from './interface';

export class GoogleTasksConnector implements ConnectorInterface {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async listContainers(): Promise<ExternalContainer[]> {
    // TODO: Call Google Tasks API GET /users/@me/lists
    return [];
  }

  async listTasks(containerId: string): Promise<ExternalTask[]> {
    // TODO: Call Google Tasks API GET /lists/{containerId}/tasks
    void containerId;
    return [];
  }

  async upsertTask(task: ExternalTask): Promise<void> {
    // TODO: Call Google Tasks API POST/PATCH /lists/{listId}/tasks
    void task;
  }

  async setStatus(externalTaskId: string, status: string): Promise<void> {
    // TODO: Call Google Tasks API PATCH /lists/{listId}/tasks/{externalTaskId}
    void externalTaskId;
    void status;
  }

  async setAssignee(externalTaskId: string, email: string): Promise<void> {
    void externalTaskId;
    void email;
  }

  async addComment(externalTaskId: string, comment: string): Promise<void> {
    // TODO: Google Tasks API does not support comments natively; stub for future
    void externalTaskId;
    void comment;
  }
}
