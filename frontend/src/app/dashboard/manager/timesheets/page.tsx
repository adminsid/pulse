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

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

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
    api.admin.getUsers().then((data) => setUsers(data || [])).catch(() => setUsers([]));
    api.admin.getProjects().then((data) => setProjects(data || [])).catch(() => setProjects([]));
  }, []);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (userId) params.user_id = userId;
      if (projectId) params.project_id = projectId;
      const data = await api.reports.getTimesheet(params);
      setEntries(data || []);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, userId, projectId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalSeconds = entries.reduce((sum, e) => sum + e.seconds, 0);

  const exportParams: Record<string, string> = {};
  if (dateFrom) exportParams.date_from = dateFrom;
  if (dateTo) exportParams.date_to = dateTo;
  if (userId) exportParams.user_id = userId;
  if (projectId) exportParams.project_id = projectId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Timesheets</h1>
        <ExportButton url={api.reports.exportCsvUrl(exportParams)} filename="timesheet.csv" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">User</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <span className="text-sm text-indigo-700 font-medium">
            {entries.length} entries
          </span>
          <span className="text-sm text-indigo-800 font-bold">
            Total: {formatSeconds(totalSeconds)}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">User</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Task</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Project</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No entries found
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 text-xs">{e.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{e.user_name}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate">{e.task_title}</td>
                    <td className="py-3 px-4 text-slate-500">{e.project_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{formatSeconds(e.seconds)}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-[120px] truncate">
                      {e.note || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
