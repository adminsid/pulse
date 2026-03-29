import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import pool from '../src/db';
import { runSync } from '../src/jobs/sync';
import { AsanaConnector } from '../src/integrations/asana';

// Mock the DB pool
jest.mock('../src/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

// Mock the AsanaConnector
jest.mock('../src/integrations/asana', () => {
  return {
    AsanaConnector: jest.fn().mockImplementation(() => {
      return {
        listTasks: jest.fn().mockResolvedValue([
          {
            id: 'ext-task-1',
            title: 'Asana Task 1',
            description: 'A task from Asana',
            status: 'todo',
            assigneeEmail: 'va@example.com',
            dueDate: '2026-12-31',
            priority: 'high',
          },
        ]),
        upsertTask: jest.fn(),
        setStatus: jest.fn(),
        setAssignee: jest.fn(),
        addComment: jest.fn(),
      };
    }),
  };
});

describe('Sync Job Integration', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully fetches tasks from provider and upserts them to the database', async () => {
    // 1. Mock the first query that finds active project integrations
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          project_integration_id: 'pi-1',
          project_id: 'p-1',
          external_container_id: 'c-1',
          sync_enabled: true,
          provider: 'asana',
          access_token_enc: 'fake-token',
        },
      ],
    });

    // 2. Mock the user lookup (for assigneeEmail)
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u1' }], // found user with email 'va@example.com'
    });

    // 3. Mock the task upsert
    mockQuery.mockResolvedValueOnce({ rows: [] });

    // 4. Mock the sync status update
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await runSync();

    // Verify listTasks was called on the connector
    // The buildConnector function in sync.ts will create an AsanaConnector
    expect(AsanaConnector).toHaveBeenCalledWith('fake-token');

    // Verify task was upserted with correct data
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.arrayContaining([
        'p-1',
        'ext-task-1',
        'Asana Task 1',
        'A task from Asana',
        'todo',
        'u1',
        '2026-12-31',
        'high',
      ])
    );

    // Verify last_synced_at was updated
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE project_integrations'),
      ['pi-1']
    );
  });

  it('skips sync if no active integrations are found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await runSync();

    expect(AsanaConnector).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
