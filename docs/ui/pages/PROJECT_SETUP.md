# Page Spec: Admin/Manager – Project Setup (`/app/projects/[projectId]`)

## Purpose
Configure a project:
- client association
- members
- system-of-record configuration (agency-owned in v1)
- status mapping
- sync health visibility

## Primary CTA
- “Save changes”

## Layout
Section: Project details
- Project name
- Client name
- System-of-record provider: Asana / Notion / Google Tasks
- External container identifier (read-only if backend enforces)

Section: Members
- List current members (VAs + managers)
- Add/remove VA (if backend supports in v1)

Section: Status mapping (required)
- Table listing Pulse statuses:
  - To do
  - In progress
  - Blocked
  - Done
  - Canceled
- External mapping input:
  - select input when options are available
  - text input fallback (show validation message if missing)

Show warning banner when incomplete:
- “Status mapping incomplete; sync may be limited.”

Section: Sync health
- Last sync time
- Last sync status (ok/degraded/error)
- Last error (if any) with link to Integrations

## Actions
- Save changes
- Optional stub: “Test sync” button (disabled if not supported)

## States
- Loading skeleton
- Error: “Project not found or you don’t have access.”

## Permissions
- Admin/Manager only.
