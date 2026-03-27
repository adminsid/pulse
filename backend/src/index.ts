import express from 'express';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import timerRouter from './routes/timer';
import checkinsRouter from './routes/checkins';
import reportsRouter from './routes/reports';
import integrationsRouter from './routes/integrations';

import { setupWebSocketServer } from './websocket/server';
import { startCheckinJob } from './jobs/checkin';
import { startSyncJob } from './jobs/sync';

import cors from 'cors';

const app = express();
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'] }));
app.use(express.json());

// Strict rate limit for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// General rate limit for all other API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Health check (no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date() });
});

// Routes — specific paths MUST come before the broad /api catch-all (tasksRouter)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/admin', apiLimiter, adminRouter);
app.use('/api/projects', apiLimiter, projectsRouter);
app.use('/api/timer', apiLimiter, timerRouter);
app.use('/api/checkins', apiLimiter, checkinsRouter);
app.use('/api/reports', apiLimiter, reportsRouter);
app.use('/api/integrations', apiLimiter, integrationsRouter);
// Broad /api catch-all for tasks — must be LAST among /api/* routes
app.use('/api', apiLimiter, tasksRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const server = createServer(app);

setupWebSocketServer(server);
startCheckinJob();
startSyncJob();

server.listen(PORT, () => {
  console.log(`Pulse backend listening on port ${PORT}`);
});

export { app, server };
