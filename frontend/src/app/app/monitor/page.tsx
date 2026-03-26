'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { LiveMonitorEntry, ComplianceMetric } from '@/lib/types';
import LiveMonitorTable from '@/components/LiveMonitorTable';
import MetricCard from '@/components/ui/MetricCard';
import InlineBanner from '@/components/ui/InlineBanner';

export default function MonitorPage() {
  const [entries, setEntries] = useState<LiveMonitorEntry[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMetric[]>([]);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe, wsStatus } = useWebSocket();

  const loadMonitor = useCallback(async () => {
    try {
      const [data, compData] = await Promise.all([
        api.reports.getLiveMonitor(),
        api.reports.getCompliance().catch(() => []),
      ]);
      setEntries(data.active_timers || []);
      setSnapshotAt(data.snapshot_at);
      setCompliance(compData || []);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitor();
    const interval = setInterval(loadMonitor, 30000);
    return () => clearInterval(interval);
  }, [loadMonitor]);

  useEffect(() => {
    const unsub = subscribe('timer_state_changed', () => { loadMonitor(); });
    const unsubPresence = subscribe('presence_changed', () => { loadMonitor(); });
    return () => { unsub(); unsubPresence(); };
  }, [subscribe, loadMonitor]);

  const activeCount = entries.filter((e) => e.state === 'running').length;
  const pausedCount = entries.filter((e) => e.state === 'paused').length;
  const missedToday = compliance.reduce((s, c) => s + (c.missed_checkins_24h || 0), 0);
  const lastActivity = compliance
    .map((c) => c.last_checkin_at)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-fg">Monitor</h1>
        <div className="flex items-center gap-2 text-xs text-muted">
          {wsStatus === 'connected' && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
            </span>
          )}
          {snapshotAt && <span>Updated {new Date(snapshotAt).toLocaleTimeString()}</span>}
        </div>
      </div>

      {wsStatus === 'disconnected' && (
        <div className="mb-4">
          <InlineBanner variant="warning">
            WebSocket disconnected. Reconnecting… data may be stale.
          </InlineBanner>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Working now" value={activeCount} state={activeCount > 0 ? 'success' : 'muted'} />
        <MetricCard title="Paused" value={pausedCount} state={pausedCount > 0 ? 'info' : 'muted'} />
        <MetricCard
          title="Missed check-ins (today)"
          value={missedToday}
          state={missedToday > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Last activity"
          value={lastActivity ? new Date(lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          state="muted"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <LiveMonitorTable entries={entries} />
        </div>
      )}
    </div>
  );
}
