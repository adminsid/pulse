'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Task } from '@/lib/types';

interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTasks(projectId: string | null): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (projectId) {
        const result = await api.tasks.list(projectId);
        setTasks(result || []);
      } else {
        // Fetch all projects then tasks for each
        const projects = await api.admin.getProjects().catch(() => []);
        const taskArrays = await Promise.all(
          projects.map((p) => api.tasks.list(p.id).catch(() => []))
        );
        const allTasks = taskArrays.flat();
        setTasks(allTasks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, isLoading, error, refresh };
}
