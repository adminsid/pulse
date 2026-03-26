# Page Spec: Client Dashboard (`/client/dashboard`) — Option A

## Purpose
Give clients confidence and visibility:
- task progress
- whether VAs are active and compliant
- whether they should contact the manager

Clients can see compliance metrics but not full check-in transcripts (v1).

## Primary CTA
- None (v1)
Optional secondary CTA:
- “Contact manager” (link or dialog stub)

## Layout
Header:
- Title: “Dashboard”
- Project selector (if multiple projects)

Section 1: Overall compliance (MetricCards)
- Working now (count)
- Away (missed check-in) (count)
- Missed check-ins today (total)
- Last activity (timestamp)

Section 2: Per-VA compliance list (required for Option A)
Use `PresenceRow` list/table.
Fields:
- VA name
- Presence
- Current task title (if any)
- Last check-in
- Missed check-ins today

Section 3: Tasks list (synced)
- Filters: status, search
- Fields:
  - title
  - status
  - due date
  - (optional) assignee (VA name)

## Behavior
- Data must be strictly scoped to client’s projects.
- If real-time websocket is available, reflect presence changes live; otherwise poll every N seconds (choose one policy).

## States
- Loading skeletons for metrics + lists
- Empty tasks:
  - “No tasks synced yet.”
  - Guidance: “Your manager will connect your project and tasks will appear here.”
- Error:
  - “Couldn’t load dashboard.” + Retry

## Permissions
- Client only sees their client_id projects and associated VAs.
