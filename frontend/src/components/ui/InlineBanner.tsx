'use client';

import React, { useState } from 'react';

type BannerVariant = 'info' | 'warning' | 'success' | 'muted';

interface InlineBannerProps {
  variant?: BannerVariant;
  children: React.ReactNode;
  dismissible?: boolean;
}

const variantStyles: Record<BannerVariant, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'ℹ',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-300',
    icon: '⚠',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-300',
    icon: '✓',
  },
  muted: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    icon: '·',
  },
};

export default function InlineBanner({ variant = 'info', children, dismissible = false }: InlineBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm ${styles.bg} ${styles.border} ${styles.text}`}
    >
      <span className="shrink-0 font-bold mt-0.5">{styles.icon}</span>
      <span className="flex-1">{children}</span>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
