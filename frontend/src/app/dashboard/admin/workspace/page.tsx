'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function WorkspacePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Workspace Settings</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Workspace ID</p>
          <p className="text-sm text-slate-800 font-mono">{user?.workspace_id || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Your Name</p>
          <p className="text-sm text-slate-800">{user?.full_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Email</p>
          <p className="text-sm text-slate-800">{user?.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Role</p>
          <p className="text-sm text-slate-800 capitalize">{user?.role || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">User ID</p>
          <p className="text-sm text-slate-800 font-mono">{user?.id || '—'}</p>
        </div>
      </div>
    </div>
  );
}
