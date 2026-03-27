'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTimer } from '@/hooks/useTimer';
import type { Task } from '@/lib/types';
import TaskCard from '@/components/TaskCard';
import { useCheckins } from '@/hooks/useCheckins';
import CheckinModal from '@/components/CheckinModal';

const STATUS_FILTERS = ['all', 'todo', 'in_progress', 'blocked', 'done'];

export default function VATasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const { start } = useTimer();
  const router = useRouter();
  const { pendingCheckins, respond } = useCheckins();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const mine = await api.tasks.listMine();
      setTasks(mine || []);
    } catch { setTasks([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleStartTimer = async (taskId: string) => {
    await start(taskId);
    router.push('/va/tasks/' + taskId);
  };

  const filtered = statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);
  const currentCheckin = pendingCheckins.find((c) => !dismissedIds.has(c.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-fg">My Tasks</h1>
        <span className="text-sm text-muted">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              statusFilter === s ? 'bg-accent text-accent-fg' : 'bg-card border border-border text-muted hover:text-fg hover:bg-muted-fg/20'
            }`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p>No tasks synced yet.</p>
          <p className="text-xs mt-1">Ask your manager to connect a project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStartTimer={handleStartTimer}
              showTimerButton={task.status !== 'done' && task.status !== 'canceled'}
              onClick={() => router.push(`/va/tasks/${task.id}`)}
            />
          ))}
        </div>
      )}

      {currentCheckin && (
        <CheckinModal
          checkin={currentCheckin}
          onRespond={respond}
          onClose={() => setDismissedIds((prev) => { const s = new Set(prev); s.add(currentCheckin.id); return s; })}
        />
      )}
    </div>
  );
}
