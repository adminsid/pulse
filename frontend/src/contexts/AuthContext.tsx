'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  realUser: User | null;
  isImpersonating: boolean;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  impersonate: (userId: string) => void;
  stopImpersonating: () => void;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    workspace_name: string;
    workspace_slug: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return {
      id: payload.id || payload.sub,
      email: payload.email,
      full_name: payload.full_name || payload.email,
      role: payload.role,
      workspace_id: payload.workspace_id,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [realUser, setRealUser] = useState<User | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadImpersonatedUser = useCallback(async (id: string, workspaceId: string) => {
    try {
        // We can't easily "get" the impersonated user's role without an API call 
        // that is itself impersonated. 
        // For now, we'll suggest refreshing the page or using a simple mechanism.
        const users = await api.admin.getUsers();
        const found = users.find(u => u.id === id);
        if (found) {
            setUser(found);
            setIsImpersonating(true);
        }
    } catch {
        localStorage.removeItem('pulse_impersonate_id');
        setIsImpersonating(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('pulse_token');
    const impId = localStorage.getItem('pulse_impersonate_id');
    
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setToken(stored);
        setRealUser(decoded);
        setUser(decoded);

        if (impId && decoded.role === 'admin') {
            loadImpersonatedUser(impId, decoded.workspace_id);
        }
      } else {
        localStorage.removeItem('pulse_token');
      }
    }
    setIsLoading(false);
  }, [loadImpersonatedUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    localStorage.setItem('pulse_token', result.token);
    setToken(result.token);
    const decoded = decodeToken(result.token);
    const u = decoded || result.user;
    setUser(u);
    setRealUser(u);
    const dest = u?.role === 'va' ? '/va/tasks' : u?.role === 'client' ? '/client/dashboard' : '/app/dashboard';
    router.push(dest);
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('pulse_token');
    localStorage.removeItem('pulse_impersonate_id');
    setToken(null);
    setUser(null);
    setRealUser(null);
    setIsImpersonating(false);
    router.push('/login');
  }, [router]);

  const impersonate = useCallback((userId: string) => {
      localStorage.setItem('pulse_impersonate_id', userId);
      window.location.reload(); // Simplest way to re-init everything with header
  }, []);

  const stopImpersonating = useCallback(() => {
      localStorage.removeItem('pulse_impersonate_id');
      window.location.reload();
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    full_name: string;
    workspace_name: string;
    workspace_slug: string;
  }) => {
    const result = await api.auth.register(data);
    localStorage.setItem('pulse_token', result.token);
    setToken(result.token);
    const decoded = decodeToken(result.token);
    const u = decoded || result.user;
    setUser(u);
    setRealUser(u);
    const dest = u?.role === 'va' ? '/va/tasks' : u?.role === 'client' ? '/client/dashboard' : '/app/dashboard';
    router.push(dest);
  }, [router]);

  return (
    <AuthContext.Provider value={{ 
        user, realUser, isImpersonating, token, isLoading, 
        login, logout, register, impersonate, stopImpersonating 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
