'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTimer } from '@/hooks/useTimer';
import { useCheckins } from '@/hooks/useCheckins';
import type { Task } from '@/lib/types';
import TimerWidget from '@/components/TimerWidget';
import CheckinModal from '@/components/CheckinModal';
import StatusPill from '@/components/ui/StatusPill';
import InlineBanner from '@/components/ui/InlineBanner';

export default function VATaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stopNote, setStopNote] = useState('');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { timerSession, elapsedSeconds, start, pause, resume, stop } = useTimer();
  const { pendingCheckins, respond } = useCheckins();

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    try { setTask(await api.tasks.get(taskId)); }
    catch { setTask(null); } finally { setIsLoading(false); }
  }, [taskId]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const isOnThisTask = timerSession?.task_id === taskId;
  const isRunning = isOnThisTask && timerSession?.state === 'running';
  const isPaused = isOnThisTask && timerSession?.state === 'paused';
  const hasActiveTimer = isRunning || isPaused;

  const handleStart = async () => {
    setError('');
    try { await start(taskId); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to start'); }
  };

  const handlePause = async () => {
    setError('');
    try { await pause(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to pause'); }
  };

  const handleResume = async () => {
    setError('');
    try { await resume(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to resume'); }
  };

  const handleStop = async () => {
    setError('');
    try { await stop(stopNote || undefined); setStopNote(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to stop'); }
  };

  const currentCheckin = pendingCheckins.find((c) => !dismissedIds.has(c.id));

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  if (!task) return <div className="text-center py-12 text-muted">Task not found.</div>;

  return (
    <div className="max-w-xl mx-auto">
      {/* Task header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-xl font-bold text-fg flex-1">{task.title}</h1>
          <StatusPill kind="task" status={task.status} />
        </div>
        {task.description && <p className="text-sm text-muted">{task.description}</p>}
        <div className="flex gap-3 mt-2 text-xs text-muted">
          {task.assignee_name && <span>Assigned: {task.assignee_name}</span>}
          {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <InlineBanner variant="warning">{error}</InlineBanner>
        </div>
      )}

      {/* Timer controls */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-5 mb-6">
        {hasActiveTimer && timerSession ? (
          <>
            <TimerWidget session={timerSession} elapsedSeconds={elapsedSeconds} />
            <div className="flex gap-3">
              {isRunning && (
                <button onClick={handlePause}
                  className="px-5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-medium transition-colors">
                  ⏸ Pause
                </button>
              )}
              {isPaused && (
                <button onClick={handleResume}
                  className="px-5 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300 rounded-xl text-sm font-medium transition-colors">
                  ▶ Resume
                </button>
              )}
              <button onClick={handleStop}
                className="px-5 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-800 dark:text-red-300 rounded-xl text-sm font-medium transition-colors">
                ■ Stop
              </button>
            </div>
            <div className="w-full">
              <label className="block text-xs text-muted mb-1">Stop note (optional)</label>
              <input type="text" value={stopNote} onChange={(e) => setStopNote(e.target.value)}
                placeholder="e.g. Completed feature X"
                className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </>
        ) : timerSession && !isOnThisTask ? (
          <div className="text-center">
            <p className="text-sm text-muted mb-2">Timer is running on another task.</p>
            <p className="text-xs text-muted">Stop that timer first before starting a new one.</p>
          </div>
        ) : (
          <>
            <div className="text-5xl font-mono font-bold text-muted">00:00:00</div>
            <p className="text-sm text-muted">No active timer</p>
            {task.status !== 'done' && task.status !== 'canceled' && (
              <button onClick={handleStart}
                className="w-full bg-accent text-accent-fg py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                ▶ Start Timer
              </button>
            )}
          </>
        )}
      </div>

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
