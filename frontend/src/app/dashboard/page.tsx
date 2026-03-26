'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const roleLinks: Record<string, { label: string; href: string }[]> = {
  admin: [
    { label: 'Manage Users', href: '/dashboard/admin/users' },
    { label: 'Manage Clients', href: '/dashboard/admin/clients' },
    { label: 'Manage Projects', href: '/dashboard/admin/projects' },
    { label: 'Integrations', href: '/dashboard/admin/integrations' },
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
    { label: 'Project Dashboard', href: '/dashboard/client/dashboard' },
  ],
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role === 'va') router.replace('/dashboard/va/timer');
    else if (user.role === 'client') router.replace('/dashboard/client/dashboard');
    else if (user.role === 'manager') router.replace('/dashboard/manager/monitor');
  }, [user, router]);

  if (!user) return null;

  const links = roleLinks[user.role] || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Welcome, {user.full_name}
      </h1>
      <p className="text-slate-500 mb-8 text-sm capitalize">Role: {user.role}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all group"
          >
            <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
              {link.label} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
