'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { LiveMonitorEntry } from '@/lib/types';
import LiveMonitorTable from '@/components/LiveMonitorTable';

export default function MonitorPage() {
  const [entries, setEntries] = useState<LiveMonitorEntry[]>([]);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe } = useWebSocket();

  const loadMonitor = useCallback(async () => {
    try {
      const data = await api.reports.getLiveMonitor();
      setEntries(data.active_timers || []);
      setSnapshotAt(data.snapshot_at);
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

  // Update from WS timer_state_changed events
  useEffect(() => {
    const unsub = subscribe('timer_state_changed', () => {
      loadMonitor();
    });
    return unsub;
  }, [subscribe, loadMonitor]);

  const activeCount = entries.filter((e) => e.state === 'running').length;
  const pausedCount = entries.filter((e) => e.state === 'paused').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Live Monitor</h1>
        {snapshotAt && (
          <span className="text-xs text-slate-400">
            Last updated: {new Date(snapshotAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">Active VAs</p>
          <p className="text-3xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">Paused VAs</p>
          <p className="text-3xl font-bold text-yellow-600">{pausedCount}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <LiveMonitorTable entries={entries} />
        </div>
      )}
    </div>
  );
}
