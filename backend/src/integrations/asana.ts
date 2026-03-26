import { ConnectorInterface, ExternalContainer, ExternalTask } from './interface';

export class AsanaConnector implements ConnectorInterface {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async listContainers(): Promise<ExternalContainer[]> {
    // TODO: Call Asana API GET /workspaces or /projects
    return [];
  }

  async listTasks(containerId: string): Promise<ExternalTask[]> {
    // TODO: Call Asana API GET /projects/{containerId}/tasks
    void containerId;
    return [];
  }

  async upsertTask(task: ExternalTask): Promise<void> {
    // TODO: Call Asana API POST/PUT /tasks
    void task;
  }

  async setStatus(externalTaskId: string, status: string): Promise<void> {
    // TODO: Call Asana API PUT /tasks/{externalTaskId} with completion status
    void externalTaskId;
    void status;
  }

  async addComment(externalTaskId: string, comment: string): Promise<void> {
    // TODO: Call Asana API POST /tasks/{externalTaskId}/stories
    void externalTaskId;
    void comment;
  }
}
