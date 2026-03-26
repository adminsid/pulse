'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { TimerSession } from '@/lib/types';

interface UseTimerResult {
  timerSession: TimerSession | null;
  elapsedSeconds: number;
  isLoading: boolean;
  start: (taskId: string) => Promise<void>;
  pause: (reason?: string) => Promise<void>;
  resume: () => Promise<void>;
  stop: (note?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function calcElapsed(session: TimerSession): number {
  if (!session) return 0;
  if (session.state === 'running') {
    const base = session.total_seconds || 0;
    const startedAt = new Date(session.started_at).getTime();
    const sinceStart = (Date.now() - startedAt) / 1000;
    return base + sinceStart;
  }
  return session.total_seconds || 0;
}

export function useTimer(): UseTimerResult {
  const [timerSession, setTimerSession] = useState<TimerSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { subscribe } = useWebSocket();

  const applySession = useCallback((session: TimerSession | null) => {
    setTimerSession(session);
    if (session) {
      setElapsedSeconds(calcElapsed(session));
    } else {
      setElapsedSeconds(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await api.timer.getCurrent();
      applySession(session);
    } catch {
      applySession(null);
    }
  }, [applySession]);

  // Tick elapsed seconds when running
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerSession?.state === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calcElapsed(timerSession));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerSession]);

  // Initial load + poll every 10s
  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
    pollIntervalRef.current = setInterval(refresh, 10000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [refresh]);

  // Subscribe to WS timer_state_changed events
  useEffect(() => {
    const unsub = subscribe('timer_state_changed', (data) => {
      applySession(data as TimerSession);
    });
    return unsub;
  }, [subscribe, applySession]);

  const start = useCallback(async (taskId: string) => {
    const session = await api.timer.start(taskId);
    applySession(session);
  }, [applySession]);

  const pause = useCallback(async (reason?: string) => {
    const session = await api.timer.pause(reason);
    applySession(session);
  }, [applySession]);

  const resume = useCallback(async () => {
    const session = await api.timer.resume();
    applySession(session);
  }, [applySession]);

  const stop = useCallback(async (note?: string) => {
    const result = await api.timer.stop(note);
    applySession(result.session);
  }, [applySession]);

  return { timerSession, elapsedSeconds, isLoading, start, pause, resume, stop, refresh };
}
