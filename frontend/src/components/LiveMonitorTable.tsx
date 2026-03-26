'use client';

import type { LiveMonitorEntry } from '@/lib/types';

interface LiveMonitorTableProps {
  entries: LiveMonitorEntry[];
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

const stateBadge: Record<string, string> = {
  running: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  stopped: 'bg-slate-100 text-slate-600',
};

export default function LiveMonitorTable({ entries }: LiveMonitorTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No active timers at this time.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Current Task</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Project</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Timer</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Started</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.session_id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4 font-medium text-slate-800">{entry.user_name}</td>
              <td className="py-3 px-4">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                    stateBadge[entry.state] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {entry.state}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">{entry.task_title}</td>
              <td className="py-3 px-4 text-slate-500">{entry.project_name}</td>
              <td className="py-3 px-4 font-mono text-slate-800">{formatSeconds(entry.elapsed_seconds)}</td>
              <td className="py-3 px-4 text-slate-500 text-xs">
                {new Date(entry.started_at).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
