'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';
import DataTable from '@/components/ui/DataTable';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try { setClients(await api.admin.getClients() || []); }
    catch { setClients([]); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.admin.createClient({ name, contact_email: contactEmail || undefined });
      setShowModal(false); setName(''); setContactEmail('');
      await loadClients();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-fg">Clients</h1>
        <button onClick={() => setShowModal(true)} className="bg-accent text-accent-fg px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          + Create Client
        </button>
      </div>

      <DataTable<Client>
        data={clients}
        isLoading={isLoading}
        onRowClick={(c) => router.push(`/app/clients/${c.id}`)}
        columns={[
          { header: 'Client Name', accessor: 'name', className: 'font-semibold text-fg' },
          { header: 'Contact Email', accessor: 'contact_email', className: 'text-muted' },
          { header: 'Created', accessor: (c) => <span className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString()}</span> },
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">Create Client</h2>
            {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Acme Corp"
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Contact Email</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@acme.com"
                  className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-accent text-accent-fg py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {isSubmitting ? 'Creating…' : 'Create Client'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-border text-fg rounded-lg text-sm hover:bg-muted-fg/20">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
