# Pulse Navigation & Routes (Role-based)

## Rule
Do not add new pages/routes unless this file is updated first.

All routes below assume an authenticated user, except `/login`.

---

## Route groups
- Admin/Manager routes live under: `/app/*`
- VA routes live under: `/va/*`
- Client routes live under: `/client/*`

---

## Public
### `/login`
- Roles: public
- Purpose: authenticate
- Primary CTA: “Sign in”

---

## Admin / Manager

### `/app/dashboard`
- Roles: admin, manager
- Purpose: high-level overview (links to Monitor, Projects, Timesheets)
- Primary CTA: none
- Contents: basic KPIs and quick links (not a reporting page)

### `/app/monitor`
- Roles: admin, manager
- Purpose: live monitoring of VA activity + compliance
- Primary CTA: “Ping VA”
- Must be realtime (websocket)

### `/app/clients`
- Roles: admin, manager
- Purpose: list clients
- Primary CTA: “Create client”

### `/app/clients/[clientId]`
- Roles: admin, manager
- Purpose: client detail
- Primary CTA: none
- Shows: client projects, compliance summary, reports/timesheets shortcuts

### `/app/projects`
- Roles: admin, manager
- Purpose: list projects
- Primary CTA: “Create project”

### `/app/projects/[projectId]`
- Roles: admin, manager
- Purpose: project setup + members + mappings + sync health
- Primary CTA: “Save changes”
- Shows:
  - SoR provider (asana/notion/google_tasks) and external container (read-only if enforced by backend)
  - status mappings
  - member assignment
  - last sync status

### `/app/users`
- Roles: admin (recommended), manager (optional; default OFF)
- Purpose: user management
- Primary CTA: “Create user”

### `/app/integrations`
- Roles:
  - admin: connect/disconnect integrations
  - manager: view only (default)
- Purpose: manage shared workspace integrations (agency-owned)
- Primary CTA: “Connect …”
- Notes:
  - model B (client-owned integrations) is out of scope for v1

### `/app/timesheets`
- Roles: admin, manager
- Purpose: filter time entries + export
- Primary CTA: “Export CSV”

---

## VA

### `/va/tasks`
- Roles: va
- Purpose: view synced tasks and start timer
- Primary CTA: “Start timer”

### `/va/tasks/[taskId]`
- Roles: va
- Purpose: task detail + timer controls + check-ins
- Primary CTA: “Start/Resume timer”

### `/va/checkins` (optional)
- Roles: va
- Purpose: check-in history summary (no transcript required in v1)
- Primary CTA: none

---

## Client

### `/client/dashboard`
- Roles: client
- Purpose: read-only visibility: tasks + progress + compliance metrics
- Primary CTA: none (or “Ask Pulse AI” if enabled later)
- Must include (Option A):
  - overall compliance summary
  - per-VA compliance list

### `/client/projects/[projectId]` (optional)
- Roles: client
- Purpose: project detail (tasks list, summary)
- Primary CTA: none

---

## Navigation items (sidebar)
### Admin/Manager sidebar
- Dashboard
- Monitor (Live)
- Clients
- Projects
- Timesheets
- Integrations
- Users (Admin only)

### VA sidebar
- My Tasks
- (Optional) Check-ins

### Client sidebar
- Dashboard
- (Optional) Projects

---

## Navigation behaviors
- Highlight current route.
- Keep nav consistent across light/dark.
- Mobile: sidebar becomes drawer; no hidden routes.
