'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Workspace', href: '/dashboard/admin/workspace' },
    { label: 'Users', href: '/dashboard/admin/users' },
    { label: 'Clients', href: '/dashboard/admin/clients' },
    { label: 'Projects', href: '/dashboard/admin/projects' },
    { label: 'Integrations', href: '/dashboard/admin/integrations' },
    { label: 'Status Mapping', href: '/dashboard/admin/status-mapping' },
    { label: 'Live Monitor', href: '/dashboard/manager/monitor' },
    { label: 'Timesheets', href: '/dashboard/manager/timesheets' },
  ],
  manager: [
    { label: 'Live Monitor', href: '/dashboard/manager/monitor' },
    { label: 'Timesheets', href: '/dashboard/manager/timesheets' },
    { label: 'Projects', href: '/dashboard/admin/projects' },
  ],
  va: [
    { label: 'My Tasks', href: '/dashboard/va/tasks' },
    { label: 'Timer', href: '/dashboard/va/timer' },
  ],
  client: [
    { label: 'Dashboard', href: '/dashboard/client/dashboard' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const role = user?.role || 'va';
  const navItems = navByRole[role] || [];

  return (
    <div className="w-60 bg-slate-900 flex flex-col h-full shrink-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <span className="text-2xl font-bold text-indigo-400">Pulse</span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-sm text-white font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
