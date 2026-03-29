# Pulse Execution Plan (Source of Truth)

## North Star (v1)
A role-based web app where:
- Tasks are synced from **agency-owned** Asana/Notion/Google Tasks (no task creation in Pulse).
- VAs run timers and respond to check-ins.
- Admin/Manager can monitor live presence/compliance.
- Clients can see synced tasks + compliance metrics (**overall + per-VA list**, Option A).
- UI is responsive + supports light/dark.
- README is accurate for local dev and env vars.

---

## Scope boundaries (v1)
In scope:
- Frontend pages/routes defined in `docs/ui/NAVIGATION.md`
- Realtime monitor/timer UX (websocket available via WebSocketContext)
- Compliance metrics display to clients (no transcript)

Out of scope (explicit):
- Client-owned integrations (Model B / BYO tools)
- Task creation inside Pulse
- OS idle detection
- Client access to check-in transcript/messages

---

## Definition of Done (v1)

### Functional
- [x] Auth works end-to-end and sessions persist per chosen mechanism.
- [x] RBAC enforced in UI and API calls (UI must not link to forbidden routes).
- [x] Admin/Manager can access:
  - [x] `/app/dashboard`
  - [x] `/app/monitor` (live)
  - [x] `/app/clients` and `/app/clients/[clientId]`
  - [x] `/app/projects` and `/app/projects/[projectId]` (mappings UI)
  - [x] `/app/timesheets` (CSV export)
  - [x] `/app/integrations` (scaffold UI)
  - [x] `/app/users` (Admin only, unless explicitly enabled)
  - [x] `/app/projects/[projectId]` Goals & Progress visualization
- [x] VA can access:
  - [x] `/va/tasks`
  - [x] `/va/tasks/[taskId]` with timer controls
  - [x] Check-in prompt UI works (Global in VALayout)
- [x] Client can access:
  - [x] `/client/dashboard` with:
    - [x] overall compliance metrics
    - [x] per-VA compliance list (scoped)
    - [x] synced tasks list (scoped)

### Realtime
- [x] Monitor updates on timer changes and presence changes without refresh.
- [x] VA UI receives check-in due prompt (Globalized).
- [x] Websocket disconnect/reconnect states are visible via Header indicator.

### UI consistency
- [x] All statuses use `StatusPill`.
- [x] No routes exist outside canonical structure.
- [x] UI matches Design System requirements (Premium, Responsive, Dark Mode).

### Non-functional
- [x] Responsive on modern mobile/tablet/desktop.
- [x] Light + dark mode verified.
- [x] Accessibility basics: keyboard nav for dialogs/menus; aria labels for icon buttons.

### Documentation
- [x] `README.md` updated for any new env vars/ports/scripts.
- [x] `docs/PLAN.md` + `task.md` updated to reflect v1 completion.

### Testing
- [x] Smoke tests executed per `docs/TEST_MATRIX.md` and results recorded.

---

## Milestones & work breakdown

### M1 — Frontend foundations (COMPLETED)
- [x] Frontend app structure (match existing repo layout)
- [x] Global layout (sidebar/header, mobile drawer)
- [x] Auth wiring to backend
- [x] Role-based route protection and navigation
- [x] Shared UI primitives (`DataTable`, `StatusPill`, `MetricCard`)

### M2 — VA experience (COMPLETED)
- [x] `/va/tasks` tasks list with filters
- [x] `/va/tasks/[taskId]` task details
- [x] TimerControls wired to API
- [x] CheckInPrompt wired to realtime events (Globalized)
- [x] Missed check-in banner behavior

### M3 — Admin/Manager experience (COMPLETED)
- [x] `/app/monitor` realtime list
- [x] `/app/timesheets` filters + client-side export (CSV & PDF)
- [x] `/app/projects/[projectId]` mappings UI + members
- [x] `/app/integrations` scaffold UI (connect buttons + status)

### M4 — Client experience (Option A) (COMPLETED)
- [x] `/client/dashboard` compliance + tasks
- [x] Per-VA compliance list scoped to client projects
- [x] Confirm no transcript visibility

### M5 — Polish + readiness (COMPLETED)
- [x] Responsive + dark mode sweep
- [x] Copy consistency sweep
- [x] Error/empty/loading state sweep
- [x] README verified end-to-end
- [x] Final smoke test

---

## Work Log (agent-maintained)

### Implemented
- **Routing Cleanup**: Removed `/dashboard` group; enforced `/app`, `/va`, `/client`.
- **UI Modernization**: Created `DataTable.tsx`; updated all list views.
- **Client-Side Exports**: Export to CSV and Print PDF (Window Print).
- **Compliance Globalization**: Moved `CheckinModal` to `VALayout` for 100% VA coverage.
- **Manager Empowerment**: Allowed Managers to configure Project Mappings.
- **Pulse Goals**: Implemented milestone grouping with progress bars and time-tracking rollups.
- **Task Re-assignment**: Enabled Admin/Manager task assignment with direct Asana sync.
- **Real-time Sync**: Upgraded timer broadcasting to workspace-level to eliminate monitor lag.
- **Browser Notifications**: Added push-style check-in alerts for VAs with click-to-focus support.
- **Admin Impersonation**: Implemented 'View As' feature for admins to troubleshoot VA and Client contexts.

### In progress
- Expanding test coverage with integration and functional tests.
- Completed smoke test route updates.

### Remaining
- v2: Advanced Analytics, Reporting Engine.

### Known gaps / risks
- Monitor depends on active WebSocket connection (stable in local dev).
