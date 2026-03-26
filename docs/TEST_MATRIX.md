# Pulse Test Matrix (v1)

## How to use this doc
- When adding features, update this matrix with new tests.
- When running manual smoke tests, record the date and result.
- Automated checks should be enforced in CI where possible.

---

## Required smoke tests (manual)

### 1) Auth + RBAC
- [ ] Admin can login and access `/app/dashboard`
- [ ] Manager can login and access `/app/monitor` and `/app/timesheets`
- [ ] VA can login and access `/va/tasks`
- [ ] Client can login and access `/client/dashboard`
- [ ] VA cannot access `/app/*` routes (redirect or 403 UX)
- [ ] Client cannot access `/app/*` or `/va/*` routes
- [ ] Direct URL navigation to unauthorized route is blocked

Record:
- Date:
- Result:
- Notes:

---

### 2) VA timer + check-ins
- [ ] VA sees synced tasks in `/va/tasks`
- [ ] VA opens a task detail page
- [ ] VA starts timer on a task
- [ ] UI shows running state + elapsed time increases
- [ ] Check-in prompt appears when due (via realtime event or polling)
- [ ] Respond “Yes, working” keeps timer running
- [ ] Respond “On break” pauses timer and presence reflects break
- [ ] Missed check-in pauses timer automatically and shows “paused due to missed check-in” banner

Record:
- Date:
- Result:
- Notes:

---

### 3) Manager/Admin live monitor
- [ ] Monitor loads with a list of VAs
- [ ] When VA starts timer, monitor updates presence to Working without refresh
- [ ] When VA pauses, monitor updates status to Break (if used) or appropriate state
- [ ] When VA misses check-in, monitor updates to Away (missed check-in)
- [ ] Realtime disconnect shows “Reconnecting…” and recovers

Record:
- Date:
- Result:
- Notes:

---

### 4) Client dashboard (Option A)
- [ ] Client sees tasks only for their projects
- [ ] Client sees overall compliance metrics
- [ ] Client sees per-VA compliance list
- [ ] Client cannot see check-in transcript/messages
- [ ] If multiple clients exist, verify strict isolation between them

Record:
- Date:
- Result:
- Notes:

---

### 5) Timesheets + export
- [ ] Timesheets page loads
- [ ] Filtering by date range works
- [ ] CSV export downloads and contains expected rows/columns

Record:
- Date:
- Result:
- Notes:

---

## Automated checks (minimum)
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Build passes

If present:
- [ ] Playwright/Cypress smoke: login → load dashboard

---

## Regression notes / known issues
- (append entries with date and description)
