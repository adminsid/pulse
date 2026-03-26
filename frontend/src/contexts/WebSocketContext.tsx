'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from './AuthContext';

type Handler = (data: unknown) => void;

interface WebSocketContextValue {
  subscribe: (eventType: string, handler: Handler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const mountedRef = useRef(true);

  const dispatch = useCallback((eventType: string, data: unknown) => {
    const handlers = subscribersRef.current.get(eventType);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return;

    const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type) {
          dispatch(msg.type, msg.data);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      const delay = Math.min(reconnectDelayRef.current, 30000);
      reconnectDelayRef.current = Math.min(delay * 2, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, dispatch]);

  useEffect(() => {
    mountedRef.current = true;
    if (token) {
      connect();
    }
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token, connect]);

  const subscribe = useCallback((eventType: string, handler: Handler) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(handler);
    return () => {
      subscribersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
  return ctx;
}
