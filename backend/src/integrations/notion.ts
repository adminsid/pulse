import { ConnectorInterface, ExternalContainer, ExternalTask } from './interface';

export class NotionConnector implements ConnectorInterface {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async listContainers(): Promise<ExternalContainer[]> {
    // TODO: Call Notion API POST /search to list databases
    return [];
  }

  async listTasks(containerId: string): Promise<ExternalTask[]> {
    // TODO: Call Notion API POST /databases/{containerId}/query
    void containerId;
    return [];
  }

  async upsertTask(task: ExternalTask): Promise<void> {
    // TODO: Call Notion API POST/PATCH /pages
    void task;
  }

  async setStatus(externalTaskId: string, status: string): Promise<void> {
    void externalTaskId;
    void status;
  }

  async setAssignee(externalTaskId: string, email: string): Promise<void> {
    void externalTaskId;
    void email;
  }

  async addComment(externalTaskId: string, comment: string): Promise<void> {
    // TODO: Call Notion API POST /comments
    void externalTaskId;
    void comment;
  }
}
