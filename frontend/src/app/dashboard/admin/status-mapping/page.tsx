'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Project, StatusMapping } from '@/lib/types';

const PULSE_STATUSES = ['todo', 'in_progress', 'review', 'done'];

export default function StatusMappingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.getProjects().then((data) => {
      setProjects(data || []);
      if (data && data.length > 0) setSelectedProjectId(data[0].id);
    }).catch(() => setProjects([]));
  }, []);

  const loadMappings = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.projects.getStatusMappings(projectId);
      const map: Record<string, string> = {};
      PULSE_STATUSES.forEach((s) => { map[s] = ''; });
      (data || []).forEach((m: StatusMapping) => { map[m.pulse_status] = m.external_status; });
      setMappings(map);
    } catch {
      const map: Record<string, string> = {};
      PULSE_STATUSES.forEach((s) => { map[s] = ''; });
      setMappings(map);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadMappings(selectedProjectId);
  }, [selectedProjectId, loadMappings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      const mappingsArr = PULSE_STATUSES.map((s) => ({
        pulse_status: s,
        external_status: mappings[s] || '',
      }));
      await api.projects.setStatusMappings(selectedProjectId, mappingsArr);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Status Mapping</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Mappings saved successfully!
        </div>
      )}

      {selectedProjectId && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Pulse Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">External Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PULSE_STATUSES.map((status) => (
                    <tr key={status} className="border-b border-slate-100">
                      <td className="py-3 px-4 capitalize font-medium text-slate-700">
                        {status.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={mappings[status] || ''}
                          onChange={(e) =>
                            setMappings((prev) => ({ ...prev, [status]: e.target.value }))
                          }
                          placeholder="External status name"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !selectedProjectId}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Mappings'}
          </button>
        </>
      )}
    </div>
  );
}
