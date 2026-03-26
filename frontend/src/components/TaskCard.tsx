'use client';

import type { Task } from '@/lib/types';
import StatusPill from '@/components/ui/StatusPill';

interface TaskCardProps {
  task: Task;
  onStartTimer?: (taskId: string) => void;
  showTimerButton?: boolean;
  onClick?: () => void;
}

const priorityBadge: Record<string, string> = {
  low:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export default function TaskCard({ task, onStartTimer, showTimerButton, onClick }: TaskCardProps) {
  const priorityStyle = priorityBadge[task.priority] || priorityBadge.medium;

  return (
    <div
      className={`bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-fg flex-1">{task.title}</h3>
        <StatusPill kind="task" status={task.status} />
      </div>

      {task.description && (
        <p className="text-xs text-muted mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
        <span className={`font-medium px-1.5 py-0.5 rounded-md capitalize ${priorityStyle}`}>
          {task.priority}
        </span>
        {task.assignee_name && (
          <span className="text-muted">· {task.assignee_name}</span>
        )}
        {task.tracked_seconds > 0 && (
          <span className="text-muted">· {formatSeconds(task.tracked_seconds)}</span>
        )}
        {task.due_date && (
          <span className="text-muted">· Due {new Date(task.due_date).toLocaleDateString()}</span>
        )}
      </div>

      {showTimerButton && onStartTimer && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartTimer(task.id); }}
          className="mt-3 w-full bg-accent/10 hover:bg-accent/20 text-accent py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          ▶ Start Timer
        </button>
      )}
    </div>
  );
}
