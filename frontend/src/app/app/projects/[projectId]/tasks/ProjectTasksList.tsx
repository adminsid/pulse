'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Task, Goal, User } from '@/lib/types';
import DataTable from '@/components/ui/DataTable';
import StatusPill from '@/components/ui/StatusPill';

interface ProjectTasksListProps {
  projectId: string;
  goals: Goal[];
  users: User[];
}

export default function ProjectTasksList({ projectId, goals: propGoals, users }: ProjectTasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>(propGoals);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, goalsData] = await Promise.all([
        api.tasks.list(projectId),
        api.goals.list(projectId)
      ]);
      setTasks(tasksData || []);
      setGoals(goalsData || []);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const updateTask = async (id: string, updates: any) => {
    try {
      await api.tasks.update(id, updates);
      // Optimistic update or reload
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable<Task>
        data={tasks}
        isLoading={isLoading}
        columns={[
          { header: 'Task', accessor: 'title', className: 'font-semibold w-1/3' },
          { 
            header: 'Status', 
            accessor: (t) => <StatusPill kind="task" status={t.status} />,
            className: 'w-24'
          },
          {
            header: 'Goal',
            accessor: (t) => (
                <select 
                  value={t.goal_id || ''}
                  onChange={(e) => updateTask(t.id, { goal_id: e.target.value || 'NULL' })}
                  className="bg-transparent text-xs border border-border rounded focus:ring-1 focus:ring-accent outline-none px-1"
                >
                    <option value="">No Goal</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
            )
          },
          {
            header: 'Assigned VA',
            accessor: (t) => (
                <select 
                  value={t.assignee_user_id || ''}
                  onChange={(e) => updateTask(t.id, { assignee_user_id: e.target.value || null })}
                  className="bg-transparent text-xs border border-border rounded focus:ring-1 focus:ring-accent outline-none px-1"
                >
                    <option value="">Unassigned</option>
                    {users.filter(u => u.role === 'va').map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
            )
          },
          {
            header: 'Worked',
            accessor: (t) => <span className="text-xs text-muted">{Math.round(t.tracked_seconds / 60)}m</span>,
            className: 'text-right'
          }
        ]}
      />
    </div>
  );
}
