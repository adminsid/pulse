'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/hooks/useTimer';
import { useWebSocket } from '@/contexts/WebSocketContext';
import TimerWidget from './TimerWidget';

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || 'Dashboard';
  return last
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const roleBadgeColor: Record<string, string> = {
  admin:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  va:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  client:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { timerSession, elapsedSeconds } = useTimer();
  const { wsStatus } = useWebSocket();
  const [dark, setDark] = useState(false);

  // Initialise dark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pulse_dark_mode');
    const enabled = saved === 'true';
    setDark(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('pulse_dark_mode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const showTimer = user?.role === 'va' && timerSession && timerSession.state !== 'stopped';

  return (
    <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between shrink-0 gap-3">
      {/* Page title — offset on mobile to avoid hamburger */}
      <h2 className="text-base lg:text-lg font-semibold text-fg pl-8 lg:pl-0">
        {getPageTitle(pathname)}
      </h2>

      {/* Timer widget (VA only) */}
      {showTimer && timerSession && (
        <div className="flex-1 flex justify-center">
          <TimerWidget session={timerSession} elapsedSeconds={elapsedSeconds} compact />
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {/* WS live indicator */}
        {user && (
          <div
            aria-label={wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Reconnecting' : 'Disconnected'}
            title={wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Reconnecting…' : 'Disconnected'}
            className="flex items-center gap-1.5"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-green-500 animate-pulse'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            {wsStatus !== 'connected' && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium hidden sm:block">
                {wsStatus === 'connecting' ? 'Reconnecting…' : 'Offline'}
              </span>
            )}
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-muted-fg transition-colors"
        >
          {dark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                roleBadgeColor[user.role] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {user.role}
            </span>
            <span className="text-sm text-fg font-medium hidden sm:block">{user.full_name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
