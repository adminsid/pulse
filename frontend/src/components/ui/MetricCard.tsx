'use client';

import React from 'react';

type MetricState = 'success' | 'warning' | 'info' | 'muted';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  state?: MetricState;
}

const stateStyles: Record<MetricState, { bar: string; value: string }> = {
  success: { bar: 'bg-green-500', value: 'text-green-600 dark:text-green-400' },
  warning: { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400' },
  info:    { bar: 'bg-indigo-500', value: 'text-indigo-600 dark:text-indigo-400' },
  muted:   { bar: 'bg-slate-400', value: 'text-slate-600 dark:text-slate-400' },
};

export default function MetricCard({ title, value, description, state = 'muted' }: MetricCardProps) {
  const styles = stateStyles[state];

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 overflow-hidden">
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar} rounded-l-xl`} />
      <div className="pl-2">
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{title}</p>
        <p className={`text-2xl font-bold ${styles.value}`}>{value}</p>
        {description && (
          <p className="text-xs text-muted mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
