'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Project, Client } from '@/lib/types';
import DataTable from '@/components/ui/DataTable';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proj, cli] = await Promise.all([
        api.admin.getProjects().catch(() => [] as Project[]),
        api.admin.getClients().catch(() => [] as Client[]),
      ]);
      setProjects(proj || []);
      setClients(cli || []);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.admin.createProject({ name, description: description || undefined, client_id: clientId || undefined });
      setShowModal(false); setName(''); setDescription(''); setClientId('');
      await loadData();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-fg">Projects</h1>
        <button onClick={() => setShowModal(true)} className="bg-accent text-accent-fg px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          + Create Project
        </button>
      </div>

      <DataTable<Project>
        data={projects}
        isLoading={isLoading}
        onRowClick={(p) => router.push(`/app/projects/${p.id}`)}
        columns={[
          { header: 'Project Name', accessor: 'name', className: 'font-semibold text-fg' },
          { header: 'Client', accessor: (p) => <span className="text-muted">{p.client_name || '—'}</span> },
          { header: 'SoR Provider', accessor: (p) => <span className="capitalize px-2 py-0.5 bg-muted-fg/10 rounded text-xs">{p.sor_provider || 'None'}</span> },
          { header: 'Created', accessor: (p) => <span className="text-xs text-muted">{new Date(p.created_at).toLocaleDateString()}</span> },
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">Create Project</h2>
            {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Website Redesign"
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional"
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Client</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">No client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-accent text-accent-fg py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {isSubmitting ? 'Creating…' : 'Create Project'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-border text-fg rounded-lg text-sm hover:bg-muted-fg/20">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
