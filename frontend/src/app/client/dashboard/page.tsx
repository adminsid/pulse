'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Project, Task, ComplianceMetric } from '@/lib/types';
import MetricCard from '@/components/ui/MetricCard';
import StatusPill from '@/components/ui/StatusPill';
import DataTable from '@/components/ui/DataTable';

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

interface ProjectWithTasks { project: Project; tasks: Task[]; }

export default function ClientDashboardPage() {
  const [data, setData] = useState<ProjectWithTasks[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe } = useWebSocket();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projects, complianceData] = await Promise.all([
        api.admin.getProjects().catch(() => [] as Project[]),
        api.reports.getCompliance().catch(() => [] as ComplianceMetric[]),
      ]);
      const withTasks = await Promise.all(
        projects.map(async (project) => ({ project, tasks: await api.tasks.list(project.id).catch(() => [] as Task[]) }))
      );
      setData(withTasks);
      setCompliance(complianceData);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const u1 = subscribe('timer_state_changed', () => { api.reports.getCompliance().then(setCompliance).catch(() => {}); });
    const u2 = subscribe('presence_changed', () => { api.reports.getCompliance().then(setCompliance).catch(() => {}); });
    return () => { u1(); u2(); };
  }, [subscribe]);

  const workingNow = compliance.filter((c) => c.current_status === 'running').length;
  const awayCount = compliance.filter((c) => c.current_status === 'paused').length;
  const missedTotal = compliance.reduce((s, c) => s + (c.missed_checkins_24h || 0), 0);
  const lastActivity = compliance.map((c) => c.last_checkin_at).filter(Boolean).sort().pop();

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-fg mb-6">Dashboard</h1>

      {/* Overall compliance metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Working now" value={workingNow} state={workingNow > 0 ? 'success' : 'muted'} />
        <MetricCard title="Away (missed check-in)" value={awayCount} state={awayCount > 0 ? 'warning' : 'muted'} />
        <MetricCard title="Missed check-ins today" value={missedTotal} state={missedTotal > 0 ? 'warning' : 'success'} />
        <MetricCard
          title="Last activity"
          value={lastActivity ? relativeTime(lastActivity) : '—'}
          state="muted"
        />
      </div>

      {/* Per-VA compliance list */}
      {compliance.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Team Compliance</h2>
          <DataTable<ComplianceMetric>
            data={compliance}
            rowKey="user_id"
            columns={[
              { header: 'VA', accessor: 'user_name', className: 'font-medium text-fg' },
              { 
                header: 'Status', 
                accessor: (m) => <StatusPill kind="presence" status={m.current_status === 'running' ? 'working' : 'break'} /> 
              },
              { header: 'Current Task', accessor: 'current_task', className: 'text-muted max-w-[160px] truncate' },
              { 
                header: 'Last Check-in', 
                accessor: (m) => <span className="text-muted text-xs">{m.last_checkin_at ? relativeTime(m.last_checkin_at) : '—'}</span> 
              },
              { 
                header: 'Missed (Today)', 
                accessor: (m) => (
                  m.missed_checkins_24h > 0 ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{m.missed_checkins_24h} missed</span>
                  ) : (
                    <span className="text-xs text-green-600 dark:text-green-400">✓ All clear</span>
                  )
                ) 
              },
            ]}
          />
        </div>
      )}

      {/* Projects */}
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Projects</h2>
      {data.length === 0 ? (
        <p className="text-sm text-muted py-4">No projects yet.</p>
      ) : (
        <div className="space-y-4">
          {data.map(({ project, tasks }) => {
            const total = tasks.length;
            const done = tasks.filter((t) => t.status === 'done').length;
            const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div key={project.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-fg">{project.name}</h3>
                    {project.description && <p className="text-xs text-muted mt-0.5">{project.description}</p>}
                  </div>
                  <span className="text-xs text-muted">{pct}% done</span>
                </div>
                <div className="w-full bg-muted-fg rounded-full h-1.5 mb-3">
                  <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />{inProgress} in progress</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{done}/{total} done</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
