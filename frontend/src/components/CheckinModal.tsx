'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Checkin } from '@/lib/types';

interface CheckinModalProps {
  checkin: Checkin;
  onRespond: (id: string, note?: string) => Promise<void>;
  onClose: () => void;
}

export default function CheckinModal({ checkin, onRespond, onClose }: CheckinModalProps) {
  const [note, setNote] = useState('');
  const [timeLeft, setTimeLeft] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRespond(checkin.id, note || undefined);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }, [checkin.id, note, onRespond, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Check-in Required</h2>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono font-semibold ${
                timeLeft <= 20 ? 'text-red-600' : 'text-slate-600'
              }`}
            >
              {timeLeft}s
            </span>
            <div
              className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center"
              style={{
                background: `conic-gradient(${timeLeft <= 20 ? '#dc2626' : '#4f46e5'} ${(timeLeft / 90) * 360}deg, #e2e8f0 0deg)`,
              }}
            />
          </div>
        </div>

        {checkin.task_title && (
          <p className="text-sm text-slate-500 mb-4">
            Task: <span className="font-medium text-slate-700">{checkin.task_title}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              What are you working on?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Describe your current progress..."
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Check-in'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
