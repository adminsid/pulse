'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import MetricCard from '@/components/ui/MetricCard';

interface QuickLink {
  label: string;
  href: string;
  desc: string;
}

const quickLinks: QuickLink[] = [
  { label: 'Monitor (Live)', href: '/app/monitor', desc: 'See active VA sessions' },
  { label: 'Clients', href: '/app/clients', desc: 'Manage your clients' },
  { label: 'Projects', href: '/app/projects', desc: 'Manage projects & mappings' },
  { label: 'Timesheets', href: '/app/timesheets', desc: 'Filter & export time logs' },
  { label: 'Integrations', href: '/app/integrations', desc: 'Connect Asana, Notion, etc.' },
  { label: 'Users', href: '/app/users', desc: 'Manage team members' },
];

export default function AppDashboardPage() {
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [missedToday, setMissedToday] = useState<number | null>(null);

  const loadKPIs = useCallback(async () => {
    try {
      const [monitor, compliance] = await Promise.all([
        api.reports.getLiveMonitor().catch(() => ({ active_timers: [] })),
        api.reports.getCompliance().catch(() => []),
      ]);
      const running = (monitor.active_timers || []).filter((e) => e.state === 'running').length;
      setLiveCount(running);
      const missed = (compliance || []).reduce((s, c) => s + (c.missed_checkins_24h || 0), 0);
      setMissedToday(missed);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-fg">Welcome back, {user?.full_name}</h1>
        <p className="text-sm text-muted capitalize mt-0.5">Role: {user?.role}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <MetricCard
          title="Working now"
          value={liveCount ?? '—'}
          state={liveCount ? 'success' : 'muted'}
          description="VAs with running timers"
        />
        <MetricCard
          title="Missed check-ins (today)"
          value={missedToday ?? '—'}
          state={missedToday ? 'warning' : 'success'}
          description="Across all active VAs"
        />
      </div>

      {/* Quick links */}
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Quick access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks
          .filter((l) => user?.role === 'admin' || l.href !== '/app/users')
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-accent/40 transition-all group"
            >
              <p className="text-sm font-semibold text-fg group-hover:text-accent transition-colors">
                {link.label} →
              </p>
              <p className="text-xs text-muted mt-0.5">{link.desc}</p>
            </Link>
          ))}
      </div>
    </div>
  );
}
