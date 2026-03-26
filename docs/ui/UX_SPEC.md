# Pulse UI/UX Spec (Source of Truth)

## Purpose
This document defines the UI/UX rules for Pulse to ensure consistency across pages and implementations (human or AI).

**If a UI decision is not covered here, do not invent.** Update this spec first.

---

## Product UI principles (non-negotiable)
1. **Clarity over density**: prioritize “what’s happening now” and “what changed recently”.
2. **One primary action per screen**: each page has a single primary CTA.
3. **Canonical statuses everywhere**: presence + task status must use shared enums and shared UI rendering.
4. **No raw IDs**: never show UUIDs, GIDs, database IDs by default. If needed, place behind “Advanced” and use a copy button.
5. **Auditability**: show a human-readable explanation for automation (e.g., “Paused due to missed check-in”).
6. **Consistency > cleverness**: reuse components; avoid custom one-off layouts.
7. **Responsive by default**: must work on modern mobile/tablet/desktop screen sizes.
8. **Dark mode supported**: all components must have dark-mode styling.

---

## Roles
- **Admin**
- **Manager**
- **VA**
- **Client**

Role badge must be visible in the header (text label).

---

## Global layout rules

### Desktop (>= 1024px)
- Left **Sidebar** navigation
- Top **Header** with workspace + user menu
- Main content is padded and uses max width for readability (but data tables can be full-width)

### Mobile (< 1024px)
- Sidebar becomes a **drawer**
- Primary navigation is still the same items; do not hide critical routes.
- Long tables degrade to stacked row cards or horizontal scroll (choose one pattern and apply consistently).

### Header content
Left:
- Workspace name (and optional client context for client role)

Right:
- Current user display name
- Role badge
- User menu: Profile (optional), Logout

---

## Copy tone and microcopy
- Short, direct verbs: “Start timer”, “Pause”, “Resume”, “Stop”, “Export CSV”, “Save changes”.
- Avoid blame: say “Missed check-in” not “Failed check-in”.
- Explain system actions: “Timer paused automatically due to missed check-in.”

### Standard labels
- “Last check-in”
- “Missed check-ins (today)”
- “Current task”
- “Time tracked (today)”
- “Time tracked (this week)”
- “Synced from {Provider}”

---

## Canonical statuses and UI mapping

### PresenceStatus (monitoring)
Presence is derived from timer + check-ins.

Enum:
- `working`
- `break`
- `away` (missed check-in)
- `offline`

Labels:
- working → “Working”
- break → “On break”
- away → “Away (missed check-in)”
- offline → “Offline”

Semantic colors:
- working → success (green)
- break → info (blue)
- away → warning (amber/orange)
- offline → muted (neutral)

**Presence must render via `StatusPill` (see COMPONENTS.md).**

### TaskStatus
Enum:
- `todo`
- `in_progress`
- `blocked`
- `done`
- `canceled`

Labels:
- todo → “To do”
- in_progress → “In progress”
- blocked → “Blocked”
- done → “Done”
- canceled → “Canceled”

Semantic colors:
- todo → muted/neutral
- in_progress → accent/info (indigo/blue)
- blocked → warning (amber/orange)
- done → success (green)
- canceled → muted (more subdued than todo)

**Task status must render via `StatusPill`.**

---

## Information hierarchy (by persona)

### VA: “What should I do now?”
Always visible/near-top on VA pages:
- Current running timer (if any)
- Current task title + project
- Check-in status (if due soon / overdue)

### Manager/Admin: “Is work on track?”
Always visible on Monitor:
- who is working
- who is away (missed check-in)
- current task
- last check-in
- missed check-ins today

### Client: “Will my work be done and do I need to escalate?”
Client dashboard must show:
- overall compliance summary for their projects
- **per-VA compliance list** for VAs assigned to their projects (Option A)
- current task context when available
- tasks list/progress

Client should not see:
- internal admin notes
- raw check-in transcript/chat (v1)
- other clients’ users/projects

---

## Standard page behaviors

### Loading states
- Use skeletons for tables and cards.
- Keep layout stable during loading.

### Empty states
Each list page must show:
- 1-line explanation
- single next step
Examples:
- “No tasks synced yet.” → “Ask your manager to connect a project.”
- “No activity to show.” → “When a VA starts a timer, it will appear here.”

### Error states
- Clear message + “Retry”
- For integration-related errors: show last error time and a link to Integrations.

### Time formatting
- Show relative time (“5m ago”) plus absolute timestamp in tooltip (“Mar 26, 2026 14:05”).
- Use user’s locale/timezone if available; otherwise workspace default.

---

## Check-in UX rules (VA)
- Check-ins should appear as a modal/dialog or persistent toast.
- Must show:
  - prompt question (“Are you working?”)
  - countdown timer
  - primary action: “Yes, working”
  - secondary actions: “On break”, “Blocked”
- On missed check-in:
  - UI must reflect paused timer after backend confirms pause
  - show banner: “Timer paused due to missed check-in.”

---

## Client-visible compliance metrics (Option A)
Client dashboard includes:

### Overall metrics (top row)
- “Working now” count
- “Away (missed check-in)” count
- “Missed check-ins today” total
- “Last activity” timestamp

### Per-VA list
Columns (desktop) / fields (mobile card):
- VA name
- Presence StatusPill
- Current task title (if any)
- Last check-in time
- Missed check-ins today

---

## Accessibility requirements
- Full keyboard navigation for menus/dialogs
- Visible focus ring
- Sufficient contrast for status pills in both themes
- Icon-only buttons require aria-label
- Prefer semantic HTML for tables and forms

---

## Real-time requirements
Pages requiring live updates:
- `/app/monitor`
- VA timer views (`/va/tasks/*`)
- client dashboard (optional live; at minimum refresh/poll)

Behavior:
- Show “Live” indicator when websocket connected.
- On disconnect: show “Reconnecting…” banner and fallback to polling if implemented.
