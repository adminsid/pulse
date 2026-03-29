# Pulse

> AI-assisted time tracking and project coordination platform for distributed virtual-assistant teams.

Pulse keeps VA teams accountable with automated check-ins, real-time presence, seamless integration with Asana / Notion / Google Tasks, and rich client-ready reports — all behind a clean role-based API.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                     Clients / Managers                 │
│                (Browser → Next.js frontend)            │
└──────────────────────┬────────────────────────────────┘
                       │  REST + WebSocket
┌──────────────────────▼────────────────────────────────┐
│            Node.js + Express + TypeScript API          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth   │ │  Admin   │ │  Timer   │ │ Reports  │  │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Background Jobs │  │  Integration Connectors  │   │
│  │ (cron checkins,  │  │  (Asana/Notion/GTask)    │   │
│  │  sync)           │  └──────────────────────────┘   │
│  └──────────────────┘                                  │
└──────────────────────┬────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      PostgreSQL 15          │
        └─────────────────────────────┘
```

---

## Roles

| Role      | Capabilities |
|-----------|-------------|
| `admin`   | Full workspace access — manage users, projects, integrations, view all reports |
| `manager` | Manage projects, assign VAs, view all reports |
| `va`      | Track time on assigned tasks, respond to check-ins |
| `client`  | Read-only access to project reports and status |

---

## Local Setup

### Prerequisites

- **Node.js** >= 20
- **Docker** + **Docker Compose**
- **npm** >= 10

### 1 — Clone the repository

```bash
git clone https://github.com/your-org/pulse.git
cd pulse
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string
```

### 3 — Start infrastructure

```bash
docker-compose up -d
# PostgreSQL is now running on localhost:5432
# Redis is now running on localhost:6379
```

### 4 — Install dependencies & run migrations

```bash
cd backend
npm install
npm run migrate
```

### 5 — Start the dev server

```bash
npm run dev
# API listening on http://localhost:3001
# WebSocket on ws://localhost:3001/ws
```

### 6 — Frontend (placeholder)

```bash
cd ../frontend
# Coming soon — Next.js app scaffold
```

---

## API Overview

All endpoints return `application/json`. Protected endpoints require:

```
Authorization: Bearer <jwt>
```

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create workspace + admin user |
| POST | /api/auth/login | Login - JWT |

### Admin (admin / manager only)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/users | Create user |
| GET | /api/admin/users | List users |
| PUT | /api/admin/users/:id | Update user |
| DELETE | /api/admin/users/:id | Deactivate user |
| POST | /api/admin/clients | Create client |
| GET | /api/admin/clients | List clients |
| POST | /api/admin/projects | Create project |
| GET | /api/admin/projects | List projects |
| POST | /api/admin/projects/:id/members | Add member |
| GET | /api/admin/projects/:id/members | List members |
| DELETE | /api/admin/projects/:id/members/:userId | Remove member |
| POST | /api/admin/integrations | Create/update integration config |
| GET | /api/admin/integrations | List integrations |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/:id | Get project (role-filtered) |
| PUT | /api/projects/:id/sor | Set System-of-Record provider |
| GET | /api/projects/:id/status-mappings | Get status mappings |
| PUT | /api/projects/:id/status-mappings | Upsert status mappings |
| POST | /api/projects/:id/sync | Trigger sync |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/:projectId/tasks | List tasks |
| GET | /api/tasks/:id | Get task |
| PUT | /api/tasks/:id | Update task (status, assignee, goal, etc.) |
| POST | /api/tasks | Create task manually |

### Goals (Admin / Manager only)

| Method | Path | Description |
|--------|-------------|------------------------------------------|
| GET | /api/projects/:projectId/goals | List project goals with progress rollup |
| POST | /api/goals | Create project goal |
| POST | /api/goals/:id | Update goal data |

### Timer

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/timer/start | Start timer (auto-stops any current) |
| POST | /api/timer/pause | Pause current timer |
| POST | /api/timer/resume | Resume paused timer |
| POST | /api/timer/stop | Stop timer + create time entry |
| GET | /api/timer/current | Get current timer state |

### Check-ins

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/checkins/pending | Get pending check-ins |
| POST | /api/checkins/:id/respond | Respond to check-in |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/reports/timesheet | Timesheet data |
| GET | /api/reports/timesheet/export | Download CSV |
| GET | /api/reports/daily-summary | Daily summary |
| GET | /api/reports/live-monitor | Real-time active timers snapshot |

---

## Integration Connectors

Each integration provider implements `ConnectorInterface`:

```typescript
interface ConnectorInterface {
  listContainers(): Promise<ExternalContainer[]>;
  listTasks(containerId: string): Promise<ExternalTask[]>;
  upsertTask(task: ExternalTask): Promise<void>;
  setStatus(externalTaskId: string, status: string): Promise<void>;
  setAssignee(externalTaskId: string, email: string): Promise<void>;
  addComment(externalTaskId: string, comment: string): Promise<void>;
}
```

Supported connectors (stubs ready for implementation):

- **Asana** — `AsanaConnector` in `src/integrations/asana.ts`
- **Notion** — `NotionConnector` in `src/integrations/notion.ts`
- **Google Tasks** — `GoogleTasksConnector` in `src/integrations/googleTasks.ts`

---

## WebSocket Events

Connect: `ws://localhost:3001/ws?token=<jwt>`

| Event | Payload | Description |
|-------|---------|-------------|
| timer_state_changed | timer_session object | Timer started/paused/resumed/stopped |
| presence_changed | { user_id, online } | User connected/disconnected |
| checkin_due | checkin object | Check-in prompt sent to VA |
| task_updated | task object | Task status/data changed |

---

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Check-in scheduler | Every 30 seconds | Creates check-in records; auto-pauses missed ones |
| Integration sync | Every 5 minutes | Pulls tasks from connected SoR providers |

---

## Running Tests

```bash
cd backend
npm test
```

---

## Project Structure

```
pulse/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── db.ts             # PostgreSQL pool
│   │   ├── migrate.ts        # Migration runner
│   │   ├── auth/             # JWT + RBAC middleware
│   │   ├── migrations/       # SQL migration files
│   │   ├── routes/           # API route handlers
│   │   ├── websocket/        # WS server + broadcast
│   │   ├── jobs/             # Cron jobs
│   │   └── integrations/     # Provider connectors
│   └── tests/
├── frontend/                 # Next.js (coming soon)
├── docker-compose.yml
├── .env.example
└── README.md
```
