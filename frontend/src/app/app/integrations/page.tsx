'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Integration, Project } from '@/lib/types';
import InlineBanner from '@/components/ui/InlineBanner';

const PROVIDERS = [
  { id: 'asana', label: 'Asana', description: 'Project management & task sync', icon: '🔷' },
  { id: 'notion', label: 'Notion', description: 'All-in-one workspace', icon: '⬜' },
  { id: 'google_tasks', label: 'Google Tasks', description: 'Google task management', icon: '✅' },
];

interface AsanaContainer { id: string; name: string; }

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null); // integrationId being linked to a project
  const [containers, setContainers] = useState<AsanaContainer[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ints, projs] = await Promise.all([
        api.admin.getIntegrations().catch(() => [] as Integration[]),
        api.admin.getProjects().catch(() => [] as Project[]),
      ]);
      setIntegrations(ints || []);
      setProjects(projs || []);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getIntegration = (provider: string) => integrations.find((i) => i.provider === provider);

  const handleSaveToken = async (provider: string) => {
    setErrors((prev) => ({ ...prev, [provider]: '' }));
    try {
      await api.admin.createIntegration({
        provider,
        access_token_enc: tokenInputs[provider] || undefined,
        metadata: {},
      });
      setConnecting(null);
      setSuccess((prev) => ({ ...prev, [provider]: 'Connected successfully!' }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, [provider]: '' })), 3000);
      await loadData();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [provider]: err instanceof Error ? err.message : 'Failed' }));
    }
  };

  const handleOpenLinkPanel = async (integrationId: string) => {
    setLinking(integrationId);
    setSelectedContainer('');
    setSelectedProject('');
    setLoadingContainers(true);
    try {
      const data = await api.integrations.listContainers(integrationId);
      setContainers(data || []);
    } catch (err) {
      setErrors((prev) => ({ ...prev, link: err instanceof Error ? err.message : 'Failed to load projects from Asana' }));
      setContainers([]);
    } finally { setLoadingContainers(false); }
  };

  const handleLinkProject = async () => {
    if (!linking || !selectedContainer || !selectedProject) return;
    setErrors((prev) => ({ ...prev, link: '' }));
    try {
      await api.integrations.linkProject({
        integration_id: linking,
        project_id: selectedProject,
        external_container_id: selectedContainer,
      });
      setLinking(null);
      setSuccess((prev) => ({ ...prev, link: 'Project linked! Syncing tasks in the background…' }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, link: '' })), 5000);
      await loadData();
    } catch (err) {
      setErrors((prev) => ({ ...prev, link: err instanceof Error ? err.message : 'Failed to link' }));
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-fg mb-2">Integrations</h1>
      <p className="text-sm text-muted mb-6">Connect your workspace to external task managers. Tasks sync every 5 minutes.</p>

      {success.link && <div className="mb-4"><InlineBanner variant="success">{success.link}</InlineBanner></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {PROVIDERS.map((provider) => {
          const integration = getIntegration(provider.id);
          const isConnected = integration?.is_active;
          const isExpanded = connecting === provider.id;

          return (
            <div key={provider.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="font-semibold text-fg">{provider.label}</h3>
                    <p className="text-xs text-muted">{provider.description}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  isConnected
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {isConnected ? '● Connected' : 'Disconnected'}
                </span>
              </div>

              {success[provider.id] && <p className="text-xs text-green-600 dark:text-green-400 mb-2">{success[provider.id]}</p>}
              {errors[provider.id] && <p className="text-xs text-destructive mb-2">{errors[provider.id]}</p>}

              {isExpanded ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Personal Access Token</label>
                    <input type="password" value={tokenInputs[provider.id] || ''}
                      onChange={(e) => setTokenInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder={provider.id === 'asana' ? '1/abc123...' : 'Token'}
                      className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveToken(provider.id)}
                      className="flex-1 bg-accent text-accent-fg py-1.5 rounded-lg text-xs font-medium hover:opacity-90">
                      Save & Connect
                    </button>
                    <button onClick={() => setConnecting(null)}
                      className="px-3 py-1.5 border border-border text-fg rounded-lg text-xs hover:bg-muted-fg/20">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setConnecting(provider.id)}
                    className="flex-1 bg-muted-fg/30 hover:bg-muted-fg/50 text-fg py-1.5 rounded-lg text-xs font-medium transition-colors border border-border">
                    {isConnected ? 'Reconfigure' : 'Connect'}
                  </button>
                  {isConnected && integration && (
                    <button onClick={() => handleOpenLinkPanel(integration.id)}
                      className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent py-1.5 rounded-lg text-xs font-medium transition-colors border border-accent/30">
                      Link to Project →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link Panel */}
      {linking && (
        <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
          <h2 className="text-base font-semibold text-fg mb-4">Link Asana Project → Pulse Project</h2>
          <p className="text-xs text-muted mb-4">
            Select which Asana project to sync and which Pulse project to map it to. Tasks will sync every 5 minutes.
          </p>

          {errors.link && <div className="mb-4"><InlineBanner variant="warning">{errors.link}</InlineBanner></div>}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Asana Project</label>
              {loadingContainers ? (
                <div className="flex items-center gap-2 text-xs text-muted py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent" />
                  Loading Asana projects…
                </div>
              ) : (
                <select value={selectedContainer} onChange={(e) => setSelectedContainer(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Select Asana project…</option>
                  {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Pulse Project</label>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">Select Pulse project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleLinkProject}
                disabled={!selectedContainer || !selectedProject}
                className="flex-1 bg-accent text-accent-fg py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40">
                Link & Start Sync
              </button>
              <button onClick={() => { setLinking(null); setErrors((p) => ({ ...p, link: '' })); }}
                className="px-4 py-2 border border-border text-fg rounded-lg text-sm hover:bg-muted-fg/20">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
