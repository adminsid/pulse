'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Project, Task } from '@/lib/types';

interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
}

export default function ClientDashboardPage() {
  const [data, setData] = useState<ProjectWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const projects = await api.admin.getProjects().catch(() => []);
      const withTasks = await Promise.all(
        projects.map(async (project) => {
          const tasks = await api.tasks.list(project.id).catch(() => []);
          return { project, tasks };
        })
      );
      setData(withTasks);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Project Dashboard</h1>
      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No projects found</div>
      ) : (
        <div className="space-y-4">
          {data.map(({ project, tasks }) => {
            const total = tasks.length;
            const done = tasks.filter((t) => t.status === 'done').length;
            const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const totalTracked = tasks.reduce((s, t) => s + t.tracked_seconds, 0);
            const hours = Math.floor(totalTracked / 3600);
            const mins = Math.floor((totalTracked % 3600) / 60);

            return (
              <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Time tracked</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {hours > 0 ? `${hours}h ` : ''}{mins}m
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Completion</span>
                    <span>{done}/{total} tasks ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {inProgress} in progress
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {done} done
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    {total - done - inProgress} other
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
