'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Goal, Task } from '@/lib/types';
import InlineBanner from '@/components/ui/InlineBanner';

interface GoalsViewProps {
  projectId: string;
}

export default function GoalsView({ projectId }: GoalsViewProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const data = await api.goals.list(projectId);
      setGoals(data || []);
    } catch {
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [projectId]);

  const handleCreate = async () => {
    if (!newTitle) return;
    try {
      await api.goals.create({
        project_id: projectId,
        title: newTitle,
        deadline: newDeadline || undefined
      });
      setNewTitle('');
      setNewDeadline('');
      setShowAdd(false);
      loadGoals();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="text-center py-4">Loading goals…</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Project Goals</h2>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-bold text-accent hover:underline"
        >
          {showAdd ? 'Cancel' : '+ Create Goal'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Goal Title</label>
            <input 
              type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Q1 Onboarding"
              className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Deadline (Optional)</label>
            <input 
              type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-bg text-fg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button 
            onClick={handleCreate}
            disabled={!newTitle}
            className="w-full bg-accent text-accent-fg py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Create Goal
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="bg-muted-fg/5 border border-border border-dashed rounded-xl p-8 text-center">
          <p className="text-sm text-muted">No goals defined for this project.</p>
          <p className="text-xs text-muted mt-1">Group tasks into goals to track progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-fg leading-tight">{goal.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    goal.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-accent/10 text-accent'
                  }`}>
                    {goal.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted mb-4">
                  <span>{goal.completed_tasks} / {goal.total_tasks} tasks</span>
                  {goal.tracked_seconds > 0 && (
                    <span>{Math.round(goal.tracked_seconds / 3600)}h {Math.round((goal.tracked_seconds % 3600) / 60)}m tracked</span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-muted">Progress</span>
                    <span className="text-fg">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted-fg/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        goal.progress === 100 ? 'bg-green-500' : 'bg-accent'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {goal.deadline && (
                <div className="px-4 py-2 bg-muted-fg/5 border-t border-border flex justify-between items-center">
                  <span className="text-[10px] text-muted uppercase font-bold">Target Deadline</span>
                  <span className="text-xs text-fg font-medium">
                    {new Date(goal.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
