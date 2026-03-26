'use client';

import type { TimerSession } from '@/lib/types';

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
  const stateBadge =
    session.state === 'running'
      ? 'bg-green-100 text-green-700'
      : session.state === 'paused'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-slate-100 text-slate-600';

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
        <span className={`w-2 h-2 rounded-full ${session.state === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-sm font-mono font-semibold text-slate-800">{formatTime(elapsedSeconds)}</span>
        {session.task_title && (
          <span className="text-xs text-slate-500 max-w-[160px] truncate">{session.task_title}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${stateBadge}`}
      >
        {session.state}
      </span>
      <div className="text-5xl font-mono font-bold text-slate-800 tracking-widest">
        {formatTime(elapsedSeconds)}
      </div>
      {session.task_title && (
        <p className="text-sm text-slate-500">{session.task_title}</p>
      )}
    </div>
  );
}
