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
- Realtime monitor/timer UX (websocket if available; otherwise polling fallback)
- Compliance metrics display to clients (no transcript)

Out of scope (explicit):
- Client-owned integrations (Model B / BYO tools)
- Task creation inside Pulse
- OS idle detection
- Client access to check-in transcript/messages

---

## Definition of Done (v1)

### Functional
- [ ] Auth works end-to-end and sessions persist per chosen mechanism.
- [ ] RBAC enforced in UI and API calls (UI must not link to forbidden routes).
- [ ] Admin/Manager can access:
  - [ ] `/app/dashboard`
  - [ ] `/app/monitor` (live)
  - [ ] `/app/clients` and `/app/clients/[clientId]`
  - [ ] `/app/projects` and `/app/projects/[projectId]` (mappings UI)
  - [ ] `/app/timesheets` (CSV export)
  - [ ] `/app/integrations` (scaffold UI)
  - [ ] `/app/users` (Admin only, unless explicitly enabled)
- [ ] VA can access:
  - [ ] `/va/tasks`
  - [ ] `/va/tasks/[taskId]` with timer controls
  - [ ] Check-in prompt UI works
- [ ] Client can access:
  - [ ] `/client/dashboard` with:
    - [ ] overall compliance metrics
    - [ ] per-VA compliance list (scoped)
    - [ ] synced tasks list (scoped)

### Realtime
- [ ] Monitor updates on timer changes and presence changes without refresh.
- [ ] VA UI receives check-in due prompt.
- [ ] Websocket disconnect/reconnect states are visible (banner or indicator).

### UI consistency
- [ ] All statuses use `StatusPill`.
- [ ] No routes exist outside `docs/ui/NAVIGATION.md`.
- [ ] UI matches `docs/ui/*` (no invented patterns).

### Non-functional
- [ ] Responsive on modern mobile/tablet/desktop.
- [ ] Light + dark mode verified.
- [ ] Accessibility basics: keyboard nav for dialogs/menus; aria labels for icon buttons.

### Documentation
- [ ] `README.md` updated for any new env vars/ports/scripts.
- [ ] `docs/PLAN.md` + `docs/TEST_MATRIX.md` updated in the PR that changes behavior.

### Testing
- [ ] Smoke tests executed per `docs/TEST_MATRIX.md` and results recorded.

---

## Milestones & work breakdown

### M1 — Frontend foundations
- [ ] Frontend app structure (match existing repo layout)
- [ ] Global layout (sidebar/header, mobile drawer)
- [ ] Auth wiring to backend
- [ ] Role-based route protection and navigation
- [ ] Shared UI primitives (Button, Card, DataTable, StatusPill)

### M2 — VA experience
- [ ] `/va/tasks` tasks list with filters
- [ ] `/va/tasks/[taskId]` task details
- [ ] TimerControls wired to API
- [ ] CheckInPrompt wired to realtime events
- [ ] Missed check-in banner behavior

### M3 — Admin/Manager experience
- [ ] `/app/monitor` realtime list
- [ ] `/app/timesheets` filters + export
- [ ] `/app/projects/[projectId]` mappings UI + members
- [ ] `/app/integrations` scaffold UI (connect buttons + status)

### M4 — Client experience (Option A)
- [ ] `/client/dashboard` compliance + tasks
- [ ] Per-VA compliance list scoped to client projects
- [ ] Confirm no transcript visibility

### M5 — Polish + readiness
- [ ] Responsive + dark mode sweep
- [ ] Copy consistency sweep
- [ ] Error/empty/loading state sweep
- [ ] README verified end-to-end
- [ ] Final smoke test

---

## Work Log (agent-maintained)
> Keep this section updated in every frontend PR.

### Implemented
- (add links to PRs/commits)

### In progress
- (add current PR scope)

### Remaining
- (add the next items to do)

### Known gaps / risks
- (add blockers and uncertainties, e.g., missing backend endpoint)
