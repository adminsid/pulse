import { IncomingMessage, Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { verifyToken } from '../auth/jwt';

export type WsEvent = {
  type: 'timer_state_changed' | 'presence_changed' | 'checkin_due' | 'task_updated';
  data: unknown;
};

// userId → Set of WebSocket connections (a user can have multiple tabs)
const connections = new Map<string, Set<WebSocket>>();
// userId → workspaceId
const userWorkspace = new Map<string, string>();

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    const { id: userId, workspace_id } = payload;

    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(ws);
    userWorkspace.set(userId, workspace_id);

    broadcastToWorkspace(workspace_id, {
      type: 'presence_changed',
      data: { user_id: userId, online: true },
    }, userId);

    ws.on('close', () => {
      const sockets = connections.get(userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          connections.delete(userId);
          broadcastToWorkspace(workspace_id, {
            type: 'presence_changed',
            data: { user_id: userId, online: false },
          });
        }
      }
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error for user ${userId}:`, err);
    });
  });

  return wss;
}

/** Send an event to all connections for a specific user */
export function broadcast(userId: string, event: WsEvent): void {
  const sockets = connections.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/** Send an event to all users in a workspace, optionally excluding one user */
export function broadcastToWorkspace(workspaceId: string, event: WsEvent, excludeUserId?: string): void {
  const payload = JSON.stringify(event);
  for (const [userId, sockets] of connections.entries()) {
    if (userId === excludeUserId) continue;
    if (userWorkspace.get(userId) !== workspaceId) continue;
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
