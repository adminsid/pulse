'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useCheckins } from '@/hooks/useCheckins';
import CheckinModal from '@/components/CheckinModal';
import { useState } from 'react';

export default function VALayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { pendingCheckins, respond } = useCheckins();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    } else if (!isLoading && user && user.role !== 'va') {
      if (user.role === 'admin' || user.role === 'manager') router.replace('/app/dashboard');
      else if (user.role === 'client') router.replace('/client/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user || user.role !== 'va') return null;

  const currentCheckin = pendingCheckins.find((c) => !dismissedIds.has(c.id));

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>

      {currentCheckin && (
        <CheckinModal
          checkin={currentCheckin}
          onRespond={respond}
          onClose={() => setDismissedIds((prev) => { const s = new Set(prev); s.add(currentCheckin.id); return s; })}
        />
      )}
    </div>
  );
}

