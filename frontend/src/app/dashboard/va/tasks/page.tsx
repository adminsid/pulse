'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTimer } from '@/hooks/useTimer';
import type { Task, Project } from '@/lib/types';
import TaskCard from '@/components/TaskCard';

const STATUS_FILTERS = ['all', 'todo', 'in_progress', 'review', 'done'];

export default function VATasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const { start } = useTimer();
  const router = useRouter();

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const projects: Project[] = await api.admin.getProjects().catch(() => []);
      const taskArrays = await Promise.all(
        projects.map((p) => api.tasks.list(p.id).catch(() => []))
      );
      setTasks(taskArrays.flat());
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleStartTimer = async (taskId: string) => {
    await start(taskId);
    router.push('/dashboard/va/timer');
  };

  const filtered =
    statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">My Tasks</h1>
        <span className="text-sm text-slate-500">{filtered.length} tasks</span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No tasks found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStartTimer={handleStartTimer}
              showTimerButton={task.status !== 'done'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
