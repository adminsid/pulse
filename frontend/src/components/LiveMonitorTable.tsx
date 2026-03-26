'use client';

import type { LiveMonitorEntry } from '@/lib/types';
import StatusPill from '@/components/ui/StatusPill';

interface LiveMonitorTableProps {
  entries: LiveMonitorEntry[];
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// Map timer state to presence status for StatusPill
function timerStateToPresence(state: string): string {
  if (state === 'running') return 'working';
  if (state === 'paused') return 'break';
  return 'offline';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function LiveMonitorTable({ entries }: LiveMonitorTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        No active timers at this time.
        <br />
        <span className="text-xs">When a VA starts a timer, it will appear here.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted-fg/30">
            <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide">VA</th>
            <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide">Status</th>
            <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide">Current Task</th>
            <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide hidden md:table-cell">Project</th>
            <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide">Timer</th>
            <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Started</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.session_id}
              className="border-b border-border hover:bg-muted-fg/20 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(entry.user_name)}
                  </div>
                  <span className="font-medium text-fg">{entry.user_name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <StatusPill kind="presence" status={timerStateToPresence(entry.state)} />
              </td>
              <td className="py-3 px-4 text-fg max-w-[200px] truncate">{entry.task_title}</td>
              <td className="py-3 px-4 text-muted hidden md:table-cell">{entry.project_name}</td>
              <td className="py-3 px-4 font-mono text-fg">{formatSeconds(entry.elapsed_seconds)}</td>
              <td className="py-3 px-4 text-muted text-xs hidden lg:table-cell">
                {new Date(entry.started_at).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
