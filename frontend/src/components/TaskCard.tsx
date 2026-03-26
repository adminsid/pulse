'use client';

import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onStartTimer?: (taskId: string) => void;
  showTimerButton?: boolean;
}

const priorityBadge: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const statusBadge: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export default function TaskCard({ task, onStartTimer, showTimerButton }: TaskCardProps) {
  const statusStyle = statusBadge[task.status] || 'bg-slate-100 text-slate-600';
  const priorityStyle = priorityBadge[task.priority] || 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-800 flex-1">{task.title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${statusStyle}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
        <span className={`font-medium px-1.5 py-0.5 rounded capitalize ${priorityStyle}`}>
          {task.priority}
        </span>
        {task.assignee_name && (
          <span className="text-slate-400">· {task.assignee_name}</span>
        )}
        {task.tracked_seconds > 0 && (
          <span className="text-slate-400">· {formatSeconds(task.tracked_seconds)}</span>
        )}
        {task.due_date && (
          <span className="text-slate-400">· Due {new Date(task.due_date).toLocaleDateString()}</span>
        )}
      </div>

      {showTimerButton && onStartTimer && (
        <button
          onClick={() => onStartTimer(task.id)}
          className="mt-3 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          ▶ Start Timer
        </button>
      )}
    </div>
  );
}
