'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    workspace_name: string;
    workspace_slug: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Decodes the JWT payload for display purposes only.
// Signature verification is intentionally skipped here — all security-critical
// decisions are enforced server-side via the Bearer token on every API request.
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('pulse_token');
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem('pulse_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    localStorage.setItem('pulse_token', result.token);
    setToken(result.token);
    const decoded = decodeToken(result.token);
    setUser(decoded || result.user);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('pulse_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

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
    setUser(decoded || result.user);
    router.push('/dashboard');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
