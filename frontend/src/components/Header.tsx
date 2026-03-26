'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/hooks/useTimer';
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
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  va: 'bg-green-100 text-green-700',
  client: 'bg-slate-100 text-slate-700',
};

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { timerSession, elapsedSeconds } = useTimer();

  const showTimer = user?.role === 'va' && timerSession && timerSession.state !== 'stopped';

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
      <h2 className="text-lg font-semibold text-slate-800">{getPageTitle(pathname)}</h2>

      {showTimer && timerSession && (
        <div className="flex-1 flex justify-center">
          <TimerWidget
            session={timerSession}
            elapsedSeconds={elapsedSeconds}
            compact
          />
        </div>
      )}

      {user && (
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
              roleBadgeColor[user.role] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {user.role}
          </span>
          <span className="text-sm text-slate-700 font-medium">{user.full_name}</span>
        </div>
      )}
    </header>
  );
}
