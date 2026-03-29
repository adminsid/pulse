import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from './jwt';

import pool from '../db';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      realUser?: TokenPayload; // Added to support auditing/logging
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.realUser = payload;
    req.user = payload;

    // Impersonation logic
    const impUser = req.headers['x-impersonate-user'] as string;
    if (impUser && payload.role === 'admin') {
      const userRes = await pool.query(
        'SELECT id, email, role, workspace_id FROM users WHERE id = $1 AND workspace_id = $2',
        [impUser, payload.workspace_id]
      );
      if (userRes.rows[0]) {
        req.user = userRes.rows[0];
      }
    }

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
