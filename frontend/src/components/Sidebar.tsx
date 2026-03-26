'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/app/dashboard' },
    { label: 'Monitor (Live)', href: '/app/monitor' },
    { label: 'Clients', href: '/app/clients' },
    { label: 'Projects', href: '/app/projects' },
    { label: 'Timesheets', href: '/app/timesheets' },
    { label: 'Integrations', href: '/app/integrations' },
    { label: 'Users', href: '/app/users' },
  ],
  manager: [
    { label: 'Dashboard', href: '/app/dashboard' },
    { label: 'Monitor (Live)', href: '/app/monitor' },
    { label: 'Clients', href: '/app/clients' },
    { label: 'Projects', href: '/app/projects' },
    { label: 'Timesheets', href: '/app/timesheets' },
    { label: 'Integrations', href: '/app/integrations' },
  ],
  va: [
    { label: 'My Tasks', href: '/va/tasks' },
  ],
  client: [
    { label: 'Dashboard', href: '/client/dashboard' },
  ],
};

// Keep legacy paths working for existing smoke tests
const legacyNavByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Users', href: '/dashboard/admin/users' },
    { label: 'Clients', href: '/dashboard/admin/clients' },
    { label: 'Projects', href: '/dashboard/admin/projects' },
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
    { label: 'Dashboard', href: '/dashboard/client/dashboard' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'va';
  // Use canonical routes if on canonical paths, else legacy
  const isCanonical = pathname.startsWith('/app') || pathname.startsWith('/va') || pathname.startsWith('/client');
  const navItems = isCanonical ? (navByRole[role] || []) : (legacyNavByRole[role] || navByRole[role] || []);

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent/20 text-white'
                : 'text-sidebar-fg hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        aria-label="Open navigation"
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar text-sidebar-fg"
        onClick={() => setMobileOpen(true)}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-60 bg-sidebar flex flex-col h-full shrink-0
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-xl font-bold text-white tracking-tight">
            <span className="text-indigo-400">Pulse</span>
          </span>
          <button
            aria-label="Close navigation"
            className="lg:hidden text-sidebar-fg hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
          <NavLinks />
        </nav>

        {/* User info + Sign out */}
        <div className="px-4 py-4 border-t border-white/10">
          {user && (
            <div className="mb-3 px-2">
              <p className="text-sm text-white font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-sidebar-fg capitalize">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-sidebar-fg hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
