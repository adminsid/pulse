/**
 * Timer state-machine tests.
 * All DB interactions are mocked — no real database required.
 */

import { Request, Response } from 'express';
import { TokenPayload } from '../src/auth/jwt';

// ─── Mock auth middleware (bypass JWT checks in unit tests) ───────────────────

jest.mock('../src/auth/middleware', () => ({
  requireAuth: (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    // user is pre-injected by the test app; just call next
    next();
  },
  requireRole: (..._roles: string[]) =>
    (_req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => next(),
}));

// ─── Mock the DB pool ──────────────────────────────────────────────────────────

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: jest.fn(),
  release: mockRelease,
};

jest.mock('../src/db', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
    connect: jest.fn().mockResolvedValue(mockClient),
  },
}));

// ─── Mock the WebSocket broadcast ─────────────────────────────────────────────

jest.mock('../src/websocket/server', () => ({
  broadcast: jest.fn(),
  broadcastToWorkspace: jest.fn(),
}));

// ─── Import router AFTER mocks are in place ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const timerRouter = require('../src/routes/timer').default;
import express from 'express';
import supertest from 'supertest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApp(user: TokenPayload) {
  const app = express();
  app.use(express.json());
  // Inject user without requiring a real JWT
  app.use((req, _res, next) => {
    (req as Request & { user: TokenPayload }).user = user;
    next();
  });
  app.use('/api/timer', timerRouter);
  return app;
}

const TEST_USER: TokenPayload = {
  id: 'user-1',
  email: 'va@test.com',
  role: 'va',
  workspace_id: 'ws-1',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/timer/start', () => {
  it('creates a timer_session with state running when no existing timer', async () => {
    // No running sessions
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })      // BEGIN (ignored value)
      .mockResolvedValueOnce({ rows: [] })      // SELECT running sessions → empty
      .mockResolvedValueOnce({                  // INSERT timer_sessions
        rows: [{
          id: 'sess-1',
          task_id: 'task-1',
          user_id: TEST_USER.id,
          state: 'running',
          started_at: new Date(),
          total_seconds: 0,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });     // COMMIT

    const app = buildApp(TEST_USER);
    const res = await supertest(app)
      .post('/api/timer/start')
      .send({ task_id: 'task-1' });

    expect(res.status).toBe(201);
    expect(res.body.state).toBe('running');
    expect(res.body.task_id).toBe('task-1');
  });

  it('stops an existing running timer before starting a new one', async () => {
    const existingSession = {
      id: 'sess-old',
      task_id: 'task-old',
      user_id: TEST_USER.id,
      state: 'running',
      started_at: new Date(Date.now() - 60000),
      resumed_at: null,
      paused_at: null,
      total_seconds: 0,
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [] })            // BEGIN
      .mockResolvedValueOnce({ rows: [existingSession] }) // SELECT running sessions
      .mockResolvedValueOnce({ rows: [] })            // UPDATE old session stopped
      .mockResolvedValueOnce({ rows: [] })            // INSERT time_entry
      .mockResolvedValueOnce({ rows: [] })            // UPDATE tasks tracked_seconds
      .mockResolvedValueOnce({                        // INSERT new timer_session
        rows: [{
          id: 'sess-new',
          task_id: 'task-new',
          user_id: TEST_USER.id,
          state: 'running',
          started_at: new Date(),
          total_seconds: 0,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });           // COMMIT

    const app = buildApp(TEST_USER);
    const res = await supertest(app)
      .post('/api/timer/start')
      .send({ task_id: 'task-new' });

    expect(res.status).toBe(201);
    expect(res.body.state).toBe('running');
    expect(res.body.id).toBe('sess-new');
  });
});

describe('POST /api/timer/pause', () => {
  it('pauses a running timer', async () => {
    const pausedSession = {
      id: 'sess-1',
      task_id: 'task-1',
      user_id: TEST_USER.id,
      state: 'paused',
      paused_at: new Date(),
      total_seconds: 60,
    };

    mockQuery.mockResolvedValueOnce({ rows: [pausedSession] });

    const app = buildApp(TEST_USER);
    const res = await supertest(app)
      .post('/api/timer/pause')
      .send({ pause_reason: 'taking a break' });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('paused');
  });

  it('returns 404 when no running timer exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const app = buildApp(TEST_USER);
    const res = await supertest(app).post('/api/timer/pause').send({});

    expect(res.status).toBe(404);
  });
});

describe('POST /api/timer/resume', () => {
  it('resumes a paused timer', async () => {
    const resumedSession = {
      id: 'sess-1',
      task_id: 'task-1',
      user_id: TEST_USER.id,
      state: 'running',
      resumed_at: new Date(),
      paused_at: null,
      total_seconds: 60,
    };

    mockQuery.mockResolvedValueOnce({ rows: [resumedSession] });

    const app = buildApp(TEST_USER);
    const res = await supertest(app).post('/api/timer/resume').send({});

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('running');
  });

  it('returns 404 when no paused timer exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const app = buildApp(TEST_USER);
    const res = await supertest(app).post('/api/timer/resume').send({});

    expect(res.status).toBe(404);
  });
});

describe('POST /api/timer/stop', () => {
  it('stops a running timer and creates a time_entry', async () => {
    const runningSession = {
      id: 'sess-1',
      task_id: 'task-1',
      user_id: TEST_USER.id,
      state: 'running',
      started_at: new Date(Date.now() - 120000),
      resumed_at: null,
      paused_at: null,
      total_seconds: 0,
    };

    const stoppedSession = { ...runningSession, state: 'stopped', stopped_at: new Date(), total_seconds: 120 };
    const timeEntry = { id: 'entry-1', seconds: 120 };

    mockClient.query
      .mockResolvedValueOnce({ rows: [] })               // BEGIN
      .mockResolvedValueOnce({ rows: [runningSession] }) // SELECT active
      .mockResolvedValueOnce({ rows: [stoppedSession] }) // UPDATE session
      .mockResolvedValueOnce({ rows: [timeEntry] })      // INSERT time_entry
      .mockResolvedValueOnce({ rows: [] })               // UPDATE tasks.tracked_seconds
      .mockResolvedValueOnce({ rows: [] });              // COMMIT

    const app = buildApp(TEST_USER);
    const res = await supertest(app).post('/api/timer/stop').send({ note: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.session.state).toBe('stopped');
    expect(res.body.time_entry.id).toBe('entry-1');
  });

  it('returns 404 when no active timer exists', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT active → empty

    const app = buildApp(TEST_USER);
    const res = await supertest(app).post('/api/timer/stop').send({});

    expect(res.status).toBe(404);
  });
});
