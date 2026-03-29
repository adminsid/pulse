'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import DataTable from '@/components/ui/DataTable';
import { useAuth } from '@/contexts/AuthContext';


interface CreateUserForm {
  full_name: string;
  email: string;
  password: string;
  role: string;
}

export default function UsersPage() {
  const { impersonate, realUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateUserForm>({ full_name: '', email: '', password: '', role: 'va' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.getUsers();
      setUsers(data || []);
    } catch { setUsers([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.admin.createUser(form);
      setShowModal(false);
      setForm({ full_name: '', email: '', password: '', role: 'va' });
      await loadUsers();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.admin.updateUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch { }
  };

  const handleRoleChange = async (user: User, newRole: string) => {
    try {
      await api.admin.updateUser(user.id, { role: newRole as any });
      await loadUsers();
    } catch { }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${user.full_name}?`)) return;
    try {
      await api.admin.deleteUser(user.id);
      await loadUsers();
    } catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-fg">Users</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-accent-fg px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Create User
        </button>
      </div>

      <DataTable<User>
        data={users}
        isLoading={isLoading}
        columns={[
          { header: 'Name', accessor: 'full_name', className: 'font-semibold text-fg' },
          { header: 'Email', accessor: 'email', className: 'text-muted' },
          { 
            header: 'Role', 
            accessor: (u) => (
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u, e.target.value)}
                className="bg-transparent border-none text-fg focus:ring-0 p-0 cursor-pointer capitalize text-xs font-medium"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="va">VA</option>
                <option value="client">Client</option>
              </select>
            )
          },
          { 
            header: 'Status', 
            accessor: (u) => (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.is_active !== false ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {u.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            )
          },
          { 
            header: 'Actions', 
            accessor: (u) => (
              <div className="flex gap-3 items-center">
                {u.id !== realUser?.id && (
                    <button onClick={() => impersonate(u.id)} className="text-[10px] text-accent hover:underline font-bold uppercase tracking-wider">
                    View As
                    </button>
                )}
                <button onClick={() => handleToggleActive(u)} className="text-[10px] text-muted hover:text-fg font-bold uppercase tracking-wider">
                  {u.is_active !== false ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(u)} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider">
                  Delete
                </button>
              </div>
            )
          },
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">Create User</h2>
            {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Jane Doe' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@example.com' },
                { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-fg mb-1">{label}</label>
                  <input type={type} value={form[key as keyof CreateUserForm]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required placeholder={placeholder}
                    className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="manager">Manager</option>
                  <option value="va">VA</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 bg-accent text-accent-fg py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {isSubmitting ? 'Creating…' : 'Create User'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-border text-fg rounded-lg text-sm hover:bg-muted-fg/20">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
