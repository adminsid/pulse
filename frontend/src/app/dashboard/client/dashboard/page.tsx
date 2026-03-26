'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Project, Task, ComplianceMetric } from '@/lib/types';

interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  running: { label: 'Working', cls: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', cls: 'bg-yellow-100 text-yellow-700' },
};

export default function ClientDashboardPage() {
  const [data, setData] = useState<ProjectWithTasks[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe } = useWebSocket();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projects, complianceData] = await Promise.all([
        api.admin.getProjects().catch(() => []),
        api.reports.getCompliance().catch(() => []),
      ]);
      const withTasks = await Promise.all(
        projects.map(async (project) => {
          const tasks = await api.tasks.list(project.id).catch(() => []);
          return { project, tasks };
        })
      );
      setData(withTasks);
      setCompliance(complianceData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh compliance on timer/presence events
  useEffect(() => {
    const unsubTimer = subscribe('timer_state_changed', () => {
      api.reports.getCompliance().then(setCompliance).catch(() => {});
    });
    const unsubPresence = subscribe('presence_changed', () => {
      api.reports.getCompliance().then(setCompliance).catch(() => {});
    });
    return () => { unsubTimer(); unsubPresence(); };
  }, [subscribe]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Project Dashboard</h1>

      {/* Compliance Metrics */}
      {compliance.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Team Status &amp; Compliance
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Team Member</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Current Task</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Last Check-in</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Missed (24h)</th>
                </tr>
              </thead>
              <tbody>
                {compliance.map((m) => {
                  const st = statusLabel[m.current_status] ?? { label: m.current_status, cls: 'bg-slate-100 text-slate-600' };
                  const lastCheckin = m.last_checkin_at
                    ? new Date(m.last_checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  return (
                    <tr key={m.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{m.user_name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate">{m.current_task}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{lastCheckin}</td>
                      <td className="py-3 px-4">
                        {m.missed_checkins_24h > 0 ? (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {m.missed_checkins_24h} missed
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">✓ All clear</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects */}
      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No projects found</div>
      ) : (
        <div className="space-y-4">
          {data.map(({ project, tasks }) => {
            const total = tasks.length;
            const done = tasks.filter((t) => t.status === 'done').length;
            const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const totalTracked = tasks.reduce((s, t) => s + t.tracked_seconds, 0);
            const hours = Math.floor(totalTracked / 3600);
            const mins = Math.floor((totalTracked % 3600) / 60);

            return (
              <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Time tracked</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {hours > 0 ? `${hours}h ` : ''}{mins}m
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Completion</span>
                    <span>{done}/{total} tasks ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {inProgress} in progress
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {done} done
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    {total - done - inProgress} other
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
