'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Project, StatusMapping, User } from '@/lib/types';
import InlineBanner from '@/components/ui/InlineBanner';
import GoalsView from './goals/GoalsView';
import ProjectTasksList from './tasks/ProjectTasksList';

const PULSE_STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [mappings, setMappings] = useState<StatusMapping[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'goals' | 'team' | 'tasks'>('goals');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proj, maps, allUsers] = await Promise.all([
        api.projects.get(projectId),
        api.projects.getStatusMappings(projectId).catch(() => [] as StatusMapping[]),
        api.admin.getUsers().catch(() => [] as User[]),
      ]);
      setProject(proj);
      setMappings(maps || []);
      setUsers(allUsers || []);
      const initial: Record<string, string> = {};
      PULSE_STATUSES.forEach((s) => {
        const existing = maps.find((m) => m.pulse_status === s);
        initial[s] = existing?.external_status || '';
      });
      setLocalMappings(initial);
    } finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveMappings = async () => {
    setIsSaving(true);
    try {
      const mappingsList = PULSE_STATUSES
        .filter((s) => localMappings[s])
        .map((s) => ({ pulse_status: s, external_status: localMappings[s] }));
      await api.projects.setStatusMappings(projectId, mappingsList);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setIsSaving(false); }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-muted">Project not found.</div>;
  }

  const TABS = [
    { id: 'goals', label: 'Goals & Progress' },
    { id: 'tasks', label: 'Project Tasks' },
    { id: 'status', label: 'Status Mappings' },
    { id: 'team', label: 'Team Members' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg">{project.name}</h1>
          {project.description && <p className="text-sm text-muted mt-0.5">{project.description}</p>}
        </div>
        <div className="flex gap-2">
            {activeTab === 'status' && (
                <button onClick={handleSaveMappings} disabled={isSaving}
                    className="bg-accent text-accent-fg px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    {isSaving ? 'Saving…' : 'Save mappings'}
                </button>
            )}
        </div>
      </div>

      <div className="flex border-b border-border mb-8 overflow-x-auto">
          {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
                    activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {saved && <div className="mb-4"><InlineBanner variant="success">Changes saved.</InlineBanner></div>}

      <div className="animate-in fade-in duration-300">
        {activeTab === 'goals' && <GoalsView projectId={projectId} />}

        {activeTab === 'tasks' && <ProjectTasksList projectId={projectId} goals={[]} users={users} />}

        {activeTab === 'status' && (
            <>
              <div className="bg-card border border-border rounded-xl p-4 mb-6 text-sm grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">SoR Provider</p>
                  <p className="text-fg capitalize">{project.sor_provider || 'None connected'}</p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">External Container</p>
                  <p className="text-fg font-mono text-xs">{project.sor_container_id || '—'}</p>
                </div>
              </div>

              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Status Mappings</h2>
              <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
                {PULSE_STATUSES.map((ps) => (
                  <div key={ps} className="flex items-center gap-4">
                    <span className="text-sm text-fg capitalize w-28 shrink-0">{ps.replace('_', ' ')}</span>
                    <span className="text-muted">→</span>
                    <input
                      type="text"
                      value={localMappings[ps] || ''}
                      onChange={(e) => setLocalMappings((prev) => ({ ...prev, [ps]: e.target.value }))}
                      placeholder="External status name"
                      className="flex-1 px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                ))}
              </div>
            </>
        )}

        {activeTab === 'team' && (
            <div className="bg-card border border-border rounded-xl p-4">
              {users.filter((u) => u.role === 'va').length === 0 ? (
                <p className="text-sm text-muted">No VAs in workspace yet.</p>
              ) : (
                <div className="space-y-4">
                  {users.filter((u) => u.role === 'va').map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-bold text-fg">{u.full_name}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}
