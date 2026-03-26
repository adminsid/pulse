'use client';

import type { TimerSession } from '@/lib/types';
import InlineBanner from '@/components/ui/InlineBanner';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

interface TimerWidgetProps {
  session: TimerSession;
  elapsedSeconds: number;
  compact?: boolean;
}

export default function TimerWidget({ session, elapsedSeconds, compact }: TimerWidgetProps) {
  const isRunning = session.state === 'running';
  const isPaused = session.state === 'paused';
  const missedCheckIn = isPaused && session.pause_reason === 'missed_checkin';

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isRunning ? 'bg-green-500 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span className="text-sm font-mono font-semibold text-fg">{formatTime(elapsedSeconds)}</span>
        {session.task_title && (
          <span className="text-xs text-muted max-w-[160px] truncate">{session.task_title}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* State badge */}
      <span
        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
          isRunning
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        }`}
      >
        {isRunning ? 'Running' : 'Paused'}
      </span>

      {/* Clock */}
      <div className="text-5xl font-mono font-bold text-fg tracking-widest">
        {formatTime(elapsedSeconds)}
      </div>

      {/* Task title */}
      {session.task_title && (
        <p className="text-sm text-muted">{session.task_title}</p>
      )}

      {/* Missed check-in banner */}
      {missedCheckIn && (
        <div className="w-full">
          <InlineBanner variant="warning">
            Timer paused automatically due to missed check-in.
          </InlineBanner>
        </div>
      )}
    </div>
  );
}
