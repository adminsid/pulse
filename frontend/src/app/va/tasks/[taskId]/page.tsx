'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTimer } from '@/hooks/useTimer';
import type { Task } from '@/lib/types';
import TimerWidget from '@/components/TimerWidget';
import StatusPill from '@/components/ui/StatusPill';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params?.taskId as string;
  const router = useRouter();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { timerSession, elapsedSeconds, start, pause, resume, stop } = useTimer();

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const data = await api.tasks.get(taskId);
      setTask(data);
    } catch { 
      setTask(null); 
    } finally { 
      setIsLoading(false); 
    }
  }, [taskId]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const activeHere = timerSession?.task_id === taskId && timerSession.state !== 'stopped';

  const handleUpdateStatus = async (status: string) => {
    if (!taskId) return;
    try {
      await api.tasks.update(taskId, { status: status as any });
      await loadTask();
    } catch { }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-8 text-center text-muted">
        <p>Task not found</p>
        <button onClick={() => router.push('/va/tasks')} className="text-accent hover:underline mt-2">
          Back to tasks
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="text-sm text-muted hover:text-fg mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to tasks
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-fg mb-2">{task.title}</h1>
            <div className="flex gap-2">
              <StatusPill kind="task" status={task.status} />
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 
                task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 
                'bg-slate-100 text-slate-600 dark:bg-slate-800'
              }`}>
                {task.priority} priority
              </span>
            </div>
          </div>
        </div>

        {task.description && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Description</h3>
            <p className="text-fg text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8 pt-6 border-t border-border">
          <div>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Sync Source</h3>
            <p className="text-sm font-medium text-fg">{task.project_id ? 'Asana / Multiple' : 'Manual'}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Time Tracked</h3>
            <p className="text-sm font-medium text-fg">
              {Math.floor(task.tracked_seconds / 3600)}h {Math.floor((task.tracked_seconds % 3600) / 60)}m
            </p>
          </div>
        </div>

        {/* Timer Control Section */}
        <div className="bg-muted-fg/5 rounded-xl p-6 border border-border flex flex-col items-center">
          {activeHere ? (
            <>
              <TimerWidget session={timerSession!} elapsedSeconds={elapsedSeconds} />
              <div className="flex gap-3 mt-6 w-full max-w-xs">
                {timerSession!.state === 'running' ? (
                  <button 
                    onClick={() => pause()} 
                    className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                  >
                    Pause
                  </button>
                ) : (
                  <button 
                    onClick={() => resume()} 
                    className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all"
                  >
                    Resume
                  </button>
                )}
                <button 
                  onClick={() => stop()} 
                  className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  Stop
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-muted text-sm mb-4">No active timer for this task</p>
              <button 
                onClick={() => start(task.id)} 
                className="bg-accent text-accent-fg px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20"
              >
                Start Tracking Time
              </button>
            </div>
          )}
        </div>

        {/* Status management */}
        <div className="mt-8 flex gap-2 justify-center flex-wrap">
          {['todo', 'in_progress', 'blocked', 'done'].map((s) => (
            <button 
              key={s} 
              onClick={() => handleUpdateStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                task.status === s ? 'bg-fg text-bg' : 'border border-border text-muted hover:text-fg hover:bg-muted-fg/10'
              }`}
            >
              Set {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
