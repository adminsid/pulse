'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client, Project, ComplianceMetric } from '@/lib/types';
import MetricCard from '@/components/ui/MetricCard';
import StatusPill from '@/components/ui/StatusPill';

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allClients, allProjects, compData] = await Promise.all([
        api.admin.getClients().catch(() => [] as Client[]),
        api.admin.getProjects().catch(() => [] as Project[]),
        api.reports.getCompliance().catch(() => [] as ComplianceMetric[]),
      ]);
      const found = allClients.find((c) => c.id === clientId) || null;
      setClient(found);
      const clientProjects = allProjects.filter((p) => p.client_id === clientId);
      setProjects(clientProjects);
      setCompliance(compData);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  if (!client) {
    return <div className="text-center py-12 text-muted">Client not found.</div>;
  }

  const workingNow = compliance.filter((c) => c.current_status === 'running').length;
  const missed = compliance.reduce((s, c) => s + (c.missed_checkins_24h || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-fg">{client.name}</h1>
        {client.contact_email && <p className="text-sm text-muted mt-0.5">{client.contact_email}</p>}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard title="Working now" value={workingNow} state={workingNow > 0 ? 'success' : 'muted'} />
        <MetricCard title="Missed check-ins (today)" value={missed} state={missed > 0 ? 'warning' : 'success'} />
      </div>

      {/* Projects */}
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Projects</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-muted py-4">No projects linked to this client.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {projects.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <p className="font-medium text-fg">{p.name}</p>
              {p.description && <p className="text-xs text-muted mt-0.5">{p.description}</p>}
              <p className="text-xs text-muted mt-1 capitalize">Provider: {p.sor_provider || 'None'}</p>
            </div>
          ))}
        </div>
      )}

      {/* VA compliance */}
      {compliance.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Team Compliance</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  {['VA', 'Status', 'Current Task', 'Last Check-in', 'Missed (today)'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compliance.map((m) => (
                  <tr key={m.user_id} className="border-b border-border hover:bg-muted-fg/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-fg">{m.user_name}</td>
                    <td className="py-3 px-4">
                      <StatusPill kind="presence" status={m.current_status === 'running' ? 'working' : 'break'} />
                    </td>
                    <td className="py-3 px-4 text-muted max-w-[180px] truncate">{m.current_task}</td>
                    <td className="py-3 px-4 text-muted text-xs">{m.last_checkin_at ? relativeTime(m.last_checkin_at) : '—'}</td>
                    <td className="py-3 px-4">
                      {m.missed_checkins_24h > 0 ? (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{m.missed_checkins_24h}</span>
                      ) : (
                        <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
