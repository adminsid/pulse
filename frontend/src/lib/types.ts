export type Role = 'admin' | 'manager' | 'va' | 'client';
export type TimerState = 'running' | 'paused' | 'stopped';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  workspace_id: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  contact_email?: string;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  client_id?: string;
  client_name?: string;
  name: string;
  description?: string;
  sor_provider?: string;
  sor_container_id?: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: string;
  assignee_user_id?: string;
  assignee_name?: string;
  tracked_seconds: number;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
}

export interface TimerSession {
  id: string;
  task_id: string;
  task_title?: string;
  user_id: string;
  state: TimerState;
  started_at: string;
  paused_at?: string;
  resumed_at?: string;
  stopped_at?: string;
  total_seconds: number;
  pause_reason?: string;
}

export interface Checkin {
  id: string;
  timer_session_id: string;
  user_id: string;
  due_at: string;
  status: 'pending' | 'responded' | 'missed';
  response_note?: string;
  responded_at?: string;
  task_id?: string;
  task_title?: string;
}

export interface Integration {
  id: string;
  workspace_id: string;
  provider: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  token_expires_at?: string;
  created_at: string;
}

export interface StatusMapping {
  id: string;
  project_id: string;
  pulse_status: string;
  external_status: string;
}

export interface TimeEntry {
  id: string;
  started_at: string;
  ended_at: string;
  seconds: number;
  note?: string;
  date: string;
  user_name: string;
  user_email: string;
  task_title: string;
  project_name: string;
  client_name?: string;
}

export interface LiveMonitorEntry {
  session_id: string;
  state: TimerState;
  started_at: string;
  user_id: string;
  user_name: string;
  task_id: string;
  task_title: string;
  project_name: string;
  elapsed_seconds: number;
}

export interface TimerStateChangedEvent {
  type: 'timer_state_changed';
  data: TimerSession;
}

export interface PresenceChangedEvent {
  type: 'presence_changed';
  data: { user_id: string; status: string };
}

export interface CheckinDueEvent {
  type: 'checkin_due';
  data: Checkin;
}

export type WSEvent = TimerStateChangedEvent | PresenceChangedEvent | CheckinDueEvent;
