# Pulse Components & UI Patterns (Allowed Inventory)

## Rule
Only use components and patterns listed here.  
If a new component or pattern is needed, update this doc first.

---

## Base components (required)

### `Button`
**Variants**
- `primary` (main CTA)
- `secondary`
- `ghost`
- `destructive`

**Sizes**
- `sm | md | lg`

**Rules**
- Each page should have at most **one** `primary` CTA in the header area.
- Destructive actions must use `destructive` and require confirmation.

---

### `StatusPill` (required)
**Purpose**
Single canonical renderer for:
- PresenceStatus
- TaskStatus

**Props**
- `kind: "presence" | "task"`
- `status: string` (enum value)
- optional `compact?: boolean`

**Rules**
- No page is allowed to render its own status color/label.
- Colors/labels must match `docs/ui/UX_SPEC.md`.

---

### `DataTable`
**Purpose**
Standard list rendering for admin/manager tables and optionally tasks.

**Features**
- column configuration
- sorting (optional)
- pagination or infinite scroll (optional; choose one)
- row click navigation (optional)
- loading skeleton state

**Responsive rule**
- Must support mobile:
  - either stacked row cards, **or**
  - horizontal scroll with sticky first column  
Choose one implementation and reuse everywhere.

---

### `Card`
Used for:
- dashboard tiles
- task summary blocks
- compliance summary blocks

---

### `MetricCard`
Used for KPI and compliance metrics:
- title
- value
- optional delta/description
- optional semantic state (success/warning/info/muted)

---

### `Dialog` / `Modal`
Used for:
- confirmations (stop timer, disconnect integration)
- check-in prompts
- “Ping VA” or “Contact manager” prompts (can be stubbed)

Must be keyboard accessible.

---

### `Toast`
Used for:
- “Saved”
- “Export started”
- “Reconnected”
- Errors that do not block the screen

---

### `FormField`
Standard input wrapper:
- label
- description (optional)
- validation message
- required indicator

**Rule**
Do not implement ad-hoc label+input patterns.

---

## Domain components (recommended)

### `TimerControls`
**Purpose**
Single reusable timer component across VA pages.

**Must show**
- elapsed time
- state (running/paused/stopped)
- task title (and project)
- last action label (optional)

**Buttons**
- Start (if stopped)
- Pause (if running)
- Resume (if paused)
- Stop (always available when running/paused; confirmation optional)

---

### `CheckInPrompt`
**Purpose**
Canonical check-in UI prompt.

**Must show**
- prompt question (“Are you working?”)
- countdown timer
- actions:
  - Primary: “Yes, working”
  - Secondary: “On break”
  - Secondary: “Blocked”

**Rules**
- If time expires, UI should not “pretend” the user missed it; wait for backend event/state update.
- After backend pauses the timer due to missed check-in, show a banner in timer area.

---

### `PresenceRow` (Monitor + Client per-VA list)
**Used in**
- `/app/monitor`
- `/client/dashboard` (Option A)

**Must show**
- VA name + avatar
- presence StatusPill
- current task title (if any)
- last check-in time
- missed check-ins today count

---

### `TaskRow` / `TaskCard`
Used in:
- VA My Tasks
- Client task list

**Must show**
- title
- task StatusPill
- due date (if present)
- project label (if list includes multiple projects)

---

## Standard banners
### `InlineBanner`
Used for:
- “Timer paused due to missed check-in.”
- “Status mapping incomplete; sync may be limited.”
- “Websocket disconnected; reconnecting…”

Variants: info / warning / success / muted

---

## Copy rules (standardized strings)
- “Last check-in: {relative}”
- “Missed check-ins (today): {n}”
- “No tasks synced yet.”
- “No activity to show.”
- “Save changes”
- “Export CSV”

---

## Forbidden patterns
- Hardcoded random colors for statuses
- New routes not listed in NAVIGATION.md
- Multiple competing button styles per page
- Exposing raw IDs to end users
