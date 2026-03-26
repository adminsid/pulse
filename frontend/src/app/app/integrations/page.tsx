'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Integration } from '@/lib/types';

const PROVIDERS = [
  { id: 'asana', label: 'Asana', description: 'Project management & task tracking', icon: '🔷' },
  { id: 'notion', label: 'Notion', description: 'All-in-one workspace', icon: '⬜' },
  { id: 'google_tasks', label: 'Google Tasks', description: 'Google task management', icon: '✅' },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try { setIntegrations(await api.admin.getIntegrations() || []); }
    catch { setIntegrations([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const getIntegration = (provider: string) => integrations.find((i) => i.provider === provider);

  const handleConnect = async (provider: string) => {
    setErrors((prev) => ({ ...prev, [provider]: '' }));
    try {
      await api.admin.createIntegration({ provider, access_token_enc: tokenInputs[provider] || undefined, metadata: {} });
      setConnecting(null);
      await loadIntegrations();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [provider]: err instanceof Error ? err.message : 'Failed' }));
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-fg mb-6">Integrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {errors[provider.id] && <p className="text-xs text-destructive mb-2">{errors[provider.id]}</p>}

              {isExpanded ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">API Token</label>
                    <input type="password" value={tokenInputs[provider.id] || ''}
                      onChange={(e) => setTokenInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder="Enter API token"
                      className="w-full px-3 py-1.5 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleConnect(provider.id)}
                      className="flex-1 bg-accent text-accent-fg py-1.5 rounded-lg text-xs font-medium hover:opacity-90">
                      Save
                    </button>
                    <button onClick={() => setConnecting(null)}
                      className="px-3 py-1.5 border border-border text-fg rounded-lg text-xs hover:bg-muted-fg/20">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConnecting(provider.id)}
                  className="w-full mt-2 bg-muted-fg/30 hover:bg-muted-fg/50 text-fg py-1.5 rounded-lg text-xs font-medium transition-colors border border-border">
                  {isConnected ? 'Reconfigure' : 'Connect'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
