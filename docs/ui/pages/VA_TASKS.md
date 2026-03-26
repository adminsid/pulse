# Page Spec: VA – My Tasks (`/va/tasks`)

## Purpose
Allow VAs to view synced tasks for projects they are assigned to and start a task-linked timer.

## Primary CTA
- “Start timer”

## Layout (desktop)
- Page title: “My Tasks”
- Filters row:
  - Client (optional if VA can be on multiple clients)
  - Project
  - Status
  - Search (title)
- Main: tasks list (`DataTable`)

## Layout (mobile)
- Filters collapse into a drawer or accordion.
- Tasks render as stacked `TaskCard` list (or the chosen DataTable mobile strategy).

## Data displayed per task
- Title (clickable)
- Project name
- Status (`StatusPill` kind=task)
- Due date (if any)
- Optional: last worked / time today

## Behavior
- Row click navigates to `/va/tasks/[taskId]`.
- “Start timer”:
  - can be row action OR enabled when one task is selected (choose one pattern and keep consistent).
  - If a timer is already running on another task:
    - show confirm dialog: “Switch task? This will stop the current timer.”

## States
- Loading: skeleton table/cards
- Empty:
  - Message: “No tasks synced yet.”
  - Guidance: “Ask your manager to connect a project.”
- Error:
  - Message: “Couldn’t load tasks.”
  - Action: Retry

## Permissions
- VA sees tasks only for projects where they are a member.
