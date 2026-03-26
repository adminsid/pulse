'use client';

import { useEffect, useRef, useState } from 'react';
import type { Checkin } from '@/lib/types';

interface CheckinModalProps {
  checkin: Checkin;
  onRespond: (checkinId: string, note?: string) => Promise<void>;
  onClose: () => void;
}

function getSecondsRemaining(dueAt: string): number {
  return Math.max(0, Math.floor((new Date(dueAt).getTime() - Date.now()) / 1000));
}

export default function CheckinModal({ checkin, onRespond, onClose }: CheckinModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsRemaining(checkin.due_at));
  const [responding, setResponding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(getSecondsRemaining(checkin.due_at));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkin.due_at]);

  const handleRespond = async (note?: string) => {
    if (responding) return;
    setResponding(true);
    try {
      await onRespond(checkin.id, note);
      onClose();
    } finally {
      setResponding(false);
    }
  };

  const pct = checkin.due_at
    ? Math.min(100, Math.max(0, (secondsLeft / 120) * 100)) // assume 2-min window
    : 100;

  const urgent = secondsLeft <= 30 && secondsLeft > 0;
  const expired = secondsLeft === 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Check-in required"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">⏰</span>
          </div>
          <h2 className="text-lg font-semibold text-fg">Check-in required</h2>
          <p className="text-sm text-muted mt-1">Are you still working?</p>
          {checkin.task_title && (
            <p className="text-xs text-muted mt-1 font-medium truncate">
              Task: {checkin.task_title}
            </p>
          )}
        </div>

        {/* Countdown ring */}
        {!expired && (
          <div className="flex flex-col items-center mb-5">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(var(--border))" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke={urgent ? '#f59e0b' : 'rgb(var(--accent))'}
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${urgent ? 'text-amber-500' : 'text-fg'}`}>
                {secondsLeft}
              </span>
            </div>
            <p className={`text-xs mt-1 ${urgent ? 'text-amber-500 font-medium' : 'text-muted'}`}>
              {urgent ? 'Respond soon!' : 'seconds remaining'}
            </p>
          </div>
        )}

        {expired && (
          <div className="text-center mb-5 text-sm text-muted">
            Waiting for backend to update timer status…
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => handleRespond()}
            disabled={responding}
            className="w-full py-2.5 bg-accent text-accent-fg rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            ✓ Yes, I'm working
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRespond('break')}
              disabled={responding}
              className="py-2 border border-border text-fg rounded-xl text-sm font-medium hover:bg-muted-fg transition-colors disabled:opacity-50"
            >
              ☕ On break
            </button>
            <button
              onClick={() => handleRespond('blocked')}
              disabled={responding}
              className="py-2 border border-border text-fg rounded-xl text-sm font-medium hover:bg-muted-fg transition-colors disabled:opacity-50"
            >
              🚫 Blocked
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full py-1.5 text-xs text-muted hover:text-fg transition-colors"
          >
            Dismiss (will not stop timer)
          </button>
        </div>
      </div>
    </div>
  );
}
