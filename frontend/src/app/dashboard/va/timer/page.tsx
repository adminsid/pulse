'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useCheckins } from '@/hooks/useCheckins';
import { api } from '@/lib/api';
import type { Task } from '@/lib/types';
import TimerWidget from '@/components/TimerWidget';
import CheckinModal from '@/components/CheckinModal';

export default function TimerPage() {
  const { timerSession, elapsedSeconds, isLoading, start, pause, resume, stop } = useTimer();
  const { pendingCheckins, respond } = useCheckins();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [stopNote, setStopNote] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [error, setError] = useState('');
  const [activeCheckinIndex, setActiveCheckinIndex] = useState(0);

  const loadTasks = useCallback(async () => {
    try {
      const projects = await api.admin.getProjects().catch(() => []);
      const taskArrays = await Promise.all(
        projects.map((p) => api.tasks.list(p.id).catch(() => []))
      );
      const all = taskArrays.flat().filter((t) => t.status !== 'done');
      setTasks(all);
      if (all.length > 0 && !selectedTaskId) setSelectedTaskId(all[0].id);
    } catch {
      setTasks([]);
    }
  }, [selectedTaskId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleStart = async () => {
    if (!selectedTaskId) { setError('Please select a task'); return; }
    setError('');
    try {
      await start(selectedTaskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    }
  };

  const handlePause = async () => {
    setError('');
    try {
      await pause(pauseReason || undefined);
      setPauseReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause timer');
    }
  };

  const handleResume = async () => {
    setError('');
    try {
      await resume();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume timer');
    }
  };

  const handleStop = async () => {
    setError('');
    try {
      await stop(stopNote || undefined);
      setStopNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    }
  };

  const isRunning = timerSession?.state === 'running';
  const isPaused = timerSession?.state === 'paused';
  const hasActiveTimer = isRunning || isPaused;

  const currentCheckin = pendingCheckins[activeCheckinIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Timer</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-6 mb-6">
        {isLoading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        ) : hasActiveTimer && timerSession ? (
          <>
            <TimerWidget session={timerSession} elapsedSeconds={elapsedSeconds} />
            <div className="flex gap-3">
              {isRunning && (
                <button
                  onClick={handlePause}
                  className="px-5 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors"
                >
                  ⏸ Pause
                </button>
              )}
              {isPaused && (
                <button
                  onClick={handleResume}
                  className="px-5 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm font-medium transition-colors"
                >
                  ▶ Resume
                </button>
              )}
              <button
                onClick={handleStop}
                className="px-5 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
              >
                ■ Stop
              </button>
            </div>
            {isRunning && (
              <div className="w-full">
                <label className="block text-xs text-slate-500 mb-1">Pause reason (optional)</label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g. Taking a break"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div className="w-full">
              <label className="block text-xs text-slate-500 mb-1">Stop note (optional)</label>
              <input
                type="text"
                value={stopNote}
                onChange={(e) => setStopNote(e.target.value)}
                placeholder="e.g. Completed feature X"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl font-mono font-bold text-slate-300">00:00:00</div>
            <p className="text-sm text-slate-400">No active timer</p>
            <div className="w-full space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleStart}
                disabled={!selectedTaskId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                ▶ Start Timer
              </button>
            </div>
          </>
        )}
      </div>

      {pendingCheckins.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-yellow-800">
            {pendingCheckins.length} pending check-in{pendingCheckins.length > 1 ? 's' : ''}
          </p>
          <div className="mt-2 flex gap-2">
            {pendingCheckins.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveCheckinIndex(i)}
                className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded-lg font-medium"
              >
                Check-in {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentCheckin && (
        <CheckinModal
          checkin={currentCheckin}
          onRespond={respond}
          onClose={() => setActiveCheckinIndex((i) => Math.max(0, i - 1))}
        />
      )}
    </div>
  );
}
