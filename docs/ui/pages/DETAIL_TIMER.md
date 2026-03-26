# Page Spec: VA Task Detail + Timer (`/va/tasks/[taskId]`)

## Purpose
Provide a single place for a VA to:
- understand the task context
- manage the timer
- respond to check-ins
- add a short work note on stop

## Primary CTA
- “Start timer” (or “Resume” when paused)

## Layout (desktop)
Left (main):
- Task title
- Status (`StatusPill` kind=task)
- Provider badge: “Synced from Asana/Notion/Google Tasks”
- Provider deep link (if present): “Open in {Provider}”
- Description (truncate long text with “Show more”)
- Activity summary (optional in v1): last update, last worked

Right (sidebar card):
- `TimerControls`
- Metrics:
  - Time today
  - Time this week
  - Last worked
- Banner area for system messages (missed check-in, reconnecting)

## Layout (mobile)
- Stack content: TimerControls near top, then task details.

## Timer actions
- Start: starts a timer session for this task.
- Pause: pauses timer (manual pause reason).
- Resume: resumes timer.
- Stop:
  - show dialog asking optional note:
    - “Add a note (optional)” text area
  - creates a time entry and stops session.

## Check-in behavior (required)
When a `checkin_due` event arrives:
- Show `CheckInPrompt` modal.
- Countdown visible.

User actions:
- “Yes, working” → records response, timer continues.
- “On break” → records break response, timer pauses with break reason.
- “Blocked” → records blocked response, sets task status to blocked (if allowed), and pauses timer.

Missed check-in:
- Backend will pause timer with reason `missed_checkin`.
- UI must show banner: “Timer paused due to missed check-in.”

## States
- Loading skeleton for task + timer
- Error: “Task not found or you don’t have access.”

## Permissions
- VA only.
