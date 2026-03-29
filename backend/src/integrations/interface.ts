export interface ExternalContainer {
  id: string;
  name: string;
}

export interface ExternalTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  assigneeEmail?: string;
  dueDate?: string;
  priority?: string;
}

export interface ConnectorInterface {
  listContainers(): Promise<ExternalContainer[]>;
  listTasks(containerId: string): Promise<ExternalTask[]>;
  upsertTask(task: ExternalTask): Promise<void>;
  setStatus(externalTaskId: string, status: string): Promise<void>;
  setAssignee(externalTaskId: string, email: string): Promise<void>;
  addComment(externalTaskId: string, comment: string): Promise<void>;
}
