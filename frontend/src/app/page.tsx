'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'va') {
      router.replace('/va/tasks');
    } else if (user.role === 'client') {
      router.replace('/client/dashboard');
    } else {
      router.replace('/app/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
    </div>
  );
}
