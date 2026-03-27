'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import MetricCard from '@/components/ui/MetricCard';
import type { Task, LiveMonitorEntry, ComplianceMetric } from '@/lib/types';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  const loadKPIs = useCallback(async () => {
    try {
      setIsLoading(true);
      setTasksLoading(true);
      const [monitor, compliance, mine] = await Promise.all([
        api.reports.getLiveMonitor().catch(() => ({ active_timers: [] as LiveMonitorEntry[] })),
        api.reports.getCompliance().catch(() => [] as ComplianceMetric[]),
        api.tasks.listMine().catch(() => [] as Task[]),
      ]);
      
      const running = (monitor.active_timers || []).filter((e) => e.state === 'running').length;
      setLiveCount(running);
      
      const missed = (compliance || []).reduce((s, c) => s + (c.missed_checkins_24h || 0), 0);
      setMissedToday(missed);
      
      setTasks(mine || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">Welcome back, {user?.full_name}</h1>
          <p className="text-sm text-muted capitalize mt-1">Role: {user?.role} • Connected to Asana</p>
        </div>
        <div className="flex gap-2">
           <button onClick={loadKPIs} className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted-fg/10 transition-colors">Refresh Data</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">My Tasks</h2>
            <Link href="/va/tasks" className="text-xs text-accent hover:underline font-medium">View all →</Link>
          </div>
          
          {tasksLoading ? (
            <div className="bg-card border border-border rounded-xl p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted text-sm italic">
              No tasks assigned to you. Connect a project to your workspace or assign yourself in Asana.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.slice(0, 4).map((task) => (
                <Link key={task.id} href={`/va/tasks/${task.id}`} className="block group">
                  <div className="bg-card border border-border p-4 rounded-xl hover:shadow-md hover:border-accent/40 transition-all h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-muted truncate max-w-[120px]">{task.project_name}</span>
                         <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                           {task.priority}
                         </span>
                      </div>
                      <h3 className="text-sm font-semibold text-fg group-hover:text-accent transition-colors line-clamp-2">{task.title}</h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                       <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                         {task.status.replace('_', ' ')}
                       </span>
                       <span className="text-[10px] text-accent font-medium group-hover:translate-x-1 transition-transform">Track Time →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Quick Access */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-fg">Quick Access</h2>
          <div className="grid grid-cols-1 gap-3">
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
      </div>
    </div>
  );
}
