'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { TimeEntry, User, Project } from '@/lib/types';
import ExportButton from '@/components/ExportButton';
import DataTable from '@/components/ui/DataTable';

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

  const exportColumns = [
    { header: 'Date', key: 'date' },
    { header: 'User', key: 'user_name' },
    { header: 'Task', key: 'task_title' },
    { header: 'Project', key: 'project_name' },
    { header: 'Seconds', key: 'seconds' },
    { header: 'Note', key: 'note' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg">Timesheets</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200 flex items-center gap-2">
            <span>⎙</span> Print PDF
          </button>
          <ExportButton 
            data={entries} 
            columns={exportColumns} 
            filename={`timesheet_${dateFrom}_to_${dateTo}.csv`} 
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
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

      <DataTable
        data={entries}
        isLoading={isLoading}
        columns={[
          { header: 'Date', accessor: 'date', className: 'text-xs text-muted' },
          { header: 'User', accessor: 'user_name', className: 'font-medium' },
          { header: 'Task', accessor: 'task_title', className: 'max-w-[200px] truncate' },
          { header: 'Project', accessor: 'project_name', className: 'text-muted' },
          { header: 'Duration', accessor: (e) => <span className="font-mono">{formatSeconds(e.seconds)}</span> },
          { header: 'Note', accessor: (e) => <span className="text-xs text-muted italic">{e.note || '—'}</span> },
        ]}
      />
    </div>
  );
}

