'use client';

import type { LiveMonitorEntry } from '@/lib/types';
import StatusPill from '@/components/ui/StatusPill';
import DataTable from '@/components/ui/DataTable';

interface LiveMonitorTableProps {
  entries: LiveMonitorEntry[];
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function timerStateToPresence(state: string): string {
  if (state === 'running') return 'working';
  if (state === 'paused') return 'break';
  return 'offline';
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function LiveMonitorTable({ entries }: LiveMonitorTableProps) {
  return (
    <DataTable<LiveMonitorEntry>
      data={entries}
      rowKey="session_id"
      emptyMessage="No active timers at this time. When a VA starts a timer, it will appear here."
      columns={[
        {
          header: 'VA',
          accessor: (e) => (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                {getInitials(e.user_name)}
              </div>
              <span className="font-medium text-fg">{e.user_name}</span>
            </div>
          ),
        },
        {
          header: 'Status',
          accessor: (e) => <StatusPill kind="presence" status={timerStateToPresence(e.state)} />,
        },
        {
          header: 'Current Task',
          accessor: 'task_title',
          className: 'max-w-[200px] truncate',
        },
        {
          header: 'Project',
          accessor: 'project_name',
          className: 'text-muted hidden md:table-cell',
        },
        {
          header: 'Timer',
          accessor: (e) => <span className="font-mono text-fg">{formatSeconds(e.elapsed_seconds)}</span>,
        },
        {
          header: 'Started',
          accessor: (e) => (
            <span className="text-muted text-xs hidden lg:table-cell">
              {new Date(e.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ),
        },
      ]}
    />
  );
}

