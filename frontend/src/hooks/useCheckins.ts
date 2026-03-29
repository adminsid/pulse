'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Checkin } from '@/lib/types';

interface UseCheckinsResult {
  pendingCheckins: Checkin[];
  respond: (id: string, note?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCheckins(): UseCheckinsResult {
  const [pendingCheckins, setPendingCheckins] = useState<Checkin[]>([]);
  const { subscribe } = useWebSocket();

  const refresh = useCallback(async () => {
    try {
      const checkins = await api.checkins.getPending();
      setPendingCheckins(checkins || []);
    } catch {
      setPendingCheckins([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to checkin_due WS events
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const unsub = subscribe('checkin_due', (data) => {
      const checkin = data as Checkin;
      
      // Trigger browser notification
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification('Pulse Check-in Required', {
              body: 'Time to check in! Click to respond.',
              tag: 'checkin-' + checkin.id,
              requireInteraction: true
          });
          n.onclick = () => {
              window.focus();
              n.close();
          };
      }

      setPendingCheckins((prev) => {
        if (prev.find((c) => c.id === checkin.id)) return prev;
        return [...prev, checkin];
      });
    });
    return unsub;
  }, [subscribe]);

  const respond = useCallback(async (id: string, note?: string) => {
    await api.checkins.respond(id, note);
    setPendingCheckins((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { pendingCheckins, respond, refresh };
}
