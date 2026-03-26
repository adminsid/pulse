'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Integration } from '@/lib/types';

const PROVIDERS = [
  { id: 'asana', label: 'Asana', description: 'Project management & task tracking' },
  { id: 'notion', label: 'Notion', description: 'All-in-one workspace' },
  { id: 'google_tasks', label: 'Google Tasks', description: 'Google task management' },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [metadataInputs, setMetadataInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.getIntegrations();
      setIntegrations(data || []);
    } catch {
      setIntegrations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const getIntegration = (provider: string) =>
    integrations.find((i) => i.provider === provider);

  const handleConnect = async (provider: string) => {
    setErrors((prev) => ({ ...prev, [provider]: '' }));
    const token = tokenInputs[provider] || '';
    let metadata: Record<string, unknown> = {};
    const metaStr = metadataInputs[provider];
    if (metaStr) {
      try {
        metadata = JSON.parse(metaStr);
      } catch {
        setErrors((prev) => ({ ...prev, [provider]: 'Invalid JSON in metadata' }));
        return;
      }
    }
    try {
      await api.admin.createIntegration({
        provider,
        access_token_enc: token || undefined,
        metadata,
      });
      setConnecting(null);
      await loadIntegrations();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [provider]: err instanceof Error ? err.message : 'Failed to connect',
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Integrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map((provider) => {
          const integration = getIntegration(provider.id);
          const isConnected = integration?.is_active;
          const isExpanded = connecting === provider.id;

          return (
            <div
              key={provider.id}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{provider.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{provider.description}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {errors[provider.id] && (
                <p className="text-xs text-red-600 mb-2">{errors[provider.id]}</p>
              )}

              {isExpanded ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      API Token / Key
                    </label>
                    <input
                      type="password"
                      value={tokenInputs[provider.id] || ''}
                      onChange={(e) =>
                        setTokenInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                      placeholder="Enter API token"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Metadata (JSON, optional)
                    </label>
                    <textarea
                      value={metadataInputs[provider.id] || ''}
                      onChange={(e) =>
                        setMetadataInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder='{}'
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setConnecting(null)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConnecting(provider.id)}
                  className="w-full mt-2 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-200"
                >
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
