# Contributing to Pulse

## UI/UX guardrails (must-follow)
The frontend **must** follow these documents as the source of truth:

- `docs/ui/UX_SPEC.md`
- `docs/ui/NAVIGATION.md`
- `docs/ui/DESIGN_TOKENS.md`
- `docs/ui/COMPONENTS.md`
- `docs/ui/pages/*`

### Rules (non-negotiable)
1. **Do not invent UI patterns.**
   - If you need a new component, status, route, page, or layout pattern, **update the docs first** in the same PR (or a preceding PR).
2. **Do not add routes that are not in `docs/ui/NAVIGATION.md`.**
   - Update `NAVIGATION.md` first, then implement.
3. **All statuses must render through the canonical components.**
   - Presence and task status must be rendered via `StatusPill` (or equivalent component defined in `docs/ui/COMPONENTS.md`).
4. **Client visibility rules must be enforced.**
   - Clients can see compliance metrics but should not see detailed check-in transcripts in v1.
5. **Responsiveness is required.**
   - All pages must work on mobile/tablet/desktop (latest industry standards).
6. **README updates are required when behavior/setup changes.**
   - If a change affects local dev setup, environment variables, scripts, URLs, ports, database setup, or run commands, update `README.md` in the same PR.

### If docs are incomplete
Stop implementation and propose a minimal doc update:
- add the missing pattern to `docs/ui/*`
- get approval (if needed)
- then implement

## PR checklist
- [ ] UI matches `docs/ui/*` specs
- [ ] Routes match `docs/ui/NAVIGATION.md`
- [ ] Status colors/labels match `docs/ui/UX_SPEC.md`
- [ ] Works in light + dark mode
- [ ] Responsive layouts verified
- [ ] `README.md` updated if setup/usage changed

### Execution tracking (required for frontend changes)
Any PR that changes the frontend **must**:
- Update `docs/PLAN.md` (Implemented / In progress / Remaining + known gaps)
- Update `docs/TEST_MATRIX.md` (add new tests and/or record smoke test results)

### README hygiene (required when setup changes)
If a PR changes local setup/usage (env vars, scripts, URLs, ports, database setup, run commands), it **must** update `README.md` in the same PR.