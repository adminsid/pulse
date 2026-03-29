import { AsanaConnector } from './asana';
import { NotionConnector } from './notion';
import { GoogleTasksConnector } from './googleTasks';
import { ConnectorInterface } from './interface';

export function buildConnector(provider: string, accessToken: string): ConnectorInterface | null {
  switch (provider) {
    case 'asana':
      return new AsanaConnector(accessToken);
    case 'notion':
      return new NotionConnector(accessToken);
    case 'google_tasks':
      return new GoogleTasksConnector(accessToken);
    default:
      return null;
  }
}
