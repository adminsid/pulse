'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { TimeEntry, User, Project } from '@/lib/types';
import ExportButton from '@/components/ExportButton';

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function weekAgoStr() { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; }

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(weekAgoStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    api.admin.getUsers().then((d) => setUsers(d || [])).catch(() => {});
    api.admin.getProjects().then((d) => setProjects(d || [])).catch(() => {});
  }, []);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (userId) params.user_id = userId;
      if (projectId) params.project_id = projectId;
      setEntries(await api.reports.getTimesheet(params) || []);
    } catch { setEntries([]); } finally { setIsLoading(false); }
  }, [dateFrom, dateTo, userId, projectId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalSeconds = entries.reduce((s, e) => s + e.seconds, 0);
  const exportParams: Record<string, string> = {};
  if (dateFrom) exportParams.date_from = dateFrom;
  if (dateTo) exportParams.date_to = dateTo;
  if (userId) exportParams.user_id = userId;
  if (projectId) exportParams.project_id = projectId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-fg">Timesheets</h1>
        <ExportButton url={api.reports.exportCsvUrl(exportParams)} filename="timesheet.csv" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'From', value: dateFrom, onChange: setDateFrom, type: 'date' as const },
            { label: 'To', value: dateTo, onChange: setDateTo, type: 'date' as const },
          ].map(({ label, value, onChange, type }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-muted mb-1">{label}</label>
              <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 flex justify-between text-sm">
          <span className="text-fg font-medium">{entries.length} entries</span>
          <span className="text-fg font-bold">Total: {formatSeconds(totalSeconds)}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {['Date', 'User', 'Task', 'Project', 'Duration', 'Note'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted">No entries found.</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-muted-fg/20 transition-colors">
                  <td className="py-3 px-4 text-muted text-xs">{e.date}</td>
                  <td className="py-3 px-4 font-medium text-fg">{e.user_name}</td>
                  <td className="py-3 px-4 text-fg max-w-[180px] truncate">{e.task_title}</td>
                  <td className="py-3 px-4 text-muted">{e.project_name}</td>
                  <td className="py-3 px-4 font-mono text-fg">{formatSeconds(e.seconds)}</td>
                  <td className="py-3 px-4 text-muted text-xs max-w-[120px] truncate">{e.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
