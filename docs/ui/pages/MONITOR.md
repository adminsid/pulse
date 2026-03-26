# Page Spec: Admin/Manager – Live Monitor (`/app/monitor`)

## Purpose
Real-time visibility into VA activity and compliance to manage delivery and escalate when needed.

## Primary CTA
- “Ping VA” (can be stubbed in v1; still present)

## Layout
Top:
- Title: “Live Monitor”
- Live indicator: “Live” when websocket connected; “Reconnecting…” banner when not.
- Filters:
  - Client
  - Project
  - Presence status (working/break/away/offline)
  - Search by VA name

Main:
- List/table of VAs using `PresenceRow` in a `DataTable` or list.

## Columns / fields
- VA (avatar + name)
- Presence (`StatusPill` kind=presence)
- Current task title (truncate)
- Client/Project (optional)
- Last check-in time
- Missed check-ins (today)

## Real-time updates (required)
- Timer start/stop/pause changes presence and current task.
- Missed check-in transitions presence to away.
- UI updates without refresh.

## Actions
Per-row actions (secondary):
- View VA activity (optional)
- Ping VA (dialog or stub)
- View current task (link if accessible)

## States
- Loading skeleton
- Empty:
  - “No VAs assigned yet.”
- Error:
  - “Couldn’t load monitor data.” + Retry

## Permissions
- Admin/Manager see all workspace VAs.
