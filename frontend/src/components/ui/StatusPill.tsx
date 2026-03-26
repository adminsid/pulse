'use client';

import React from 'react';

// ─── Presence ────────────────────────────────────────────────────────────────
const presenceConfig: Record<string, { label: string; classes: string }> = {
  working: {
    label: 'Working',
    classes: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  },
  break: {
    label: 'On break',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  },
  away: {
    label: 'Away (missed check-in)',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  },
  offline: {
    label: 'Offline',
    classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  },
};

// ─── Task ─────────────────────────────────────────────────────────────────────
const taskConfig: Record<string, { label: string; classes: string }> = {
  todo: {
    label: 'To do',
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  in_progress: {
    label: 'In progress',
    classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  },
  blocked: {
    label: 'Blocked',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  },
  done: {
    label: 'Done',
    classes: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  },
  canceled: {
    label: 'Canceled',
    classes:
      'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 line-through',
  },
};

interface StatusPillProps {
  kind: 'presence' | 'task';
  status: string;
  compact?: boolean;
}

export default function StatusPill({ kind, status, compact }: StatusPillProps) {
  const config =
    kind === 'presence'
      ? (presenceConfig[status] ?? presenceConfig.offline)
      : (taskConfig[status] ?? {
          label: status.replace(/_/g, ' '),
          classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        });

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium leading-none ${
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
      } ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
