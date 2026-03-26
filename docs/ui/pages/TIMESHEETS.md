# Page Spec: Admin/Manager – Timesheets (`/app/timesheets`)

## Purpose
Enable invoicing and reporting via filterable time entries and CSV export.

## Primary CTA
- “Export CSV”

## Layout
Top:
- Title: “Timesheets”
- Filters:
  - Date range (required)
  - Client
  - Project
  - VA
- Summary row:
  - Total time in range
  - Total time by VA (optional)
Main:
- Time entries table (`DataTable`)

## Table fields
- Date
- VA
- Client/Project
- Task title
- Duration
- Notes (truncate; show full on hover or detail)

## Actions
- Export CSV triggers backend export for current filters.
- Optional stub: “Generate daily summary” (not required for v1).

## States
- Loading skeleton
- Empty:
  - “No time entries for this range.”
- Error:
  - “Couldn’t load time entries.” + Retry

## Permissions
- Admin/Manager only.
