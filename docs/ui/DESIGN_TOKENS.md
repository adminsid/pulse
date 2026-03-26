# Pulse Design Tokens (Neutral + Light/Dark)

## Goal
Provide consistent, neutral, “operations-grade” styling with full light/dark mode support.

This repo may implement tokens via CSS variables (recommended) and/or Tailwind theme config. Regardless of mechanism, the semantics below must hold.

---

## Theme modes
- Light mode (default)
- Dark mode (required)

All components must be legible and accessible in both modes.

---

## Color strategy
- **Neutral foundation**: grays for surfaces, borders, typography.
- **Single accent**: indigo/blue for primary actions and highlights.
- **Semantic colors**: used only for statuses and alerts.

### Accent (brand-light)
- Accent hue: indigo/blue (avoid neon)
- Use accent for:
  - primary buttons
  - active nav state
  - links
  - in_progress status (task)

---

## Semantic status colors (must match UX_SPEC.md)

### PresenceStatus
- working: success (green)
- break: info (blue)
- away: warning (amber/orange)
- offline: muted (gray)

### TaskStatus
- todo: muted/neutral
- in_progress: accent/info (indigo/blue)
- blocked: warning (amber/orange)
- done: success (green)
- canceled: muted (subdued)

---

## Recommended token names (CSS variable style)
### Surfaces & text
- `--bg`
- `--fg`
- `--card`
- `--card-fg`
- `--muted`
- `--muted-fg`
- `--border`

### Brand / actions
- `--accent`
- `--accent-fg`

### Semantic
- `--success`
- `--success-fg`
- `--warning`
- `--warning-fg`
- `--info`
- `--info-fg`
- `--destructive`
- `--destructive-fg`

### Shadows / radius
- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--shadow-sm`
- `--shadow-md`

---

## Typography
- Font: system sans or a single modern sans (consistent across app)
- Scale:
  - Page title (H1): 20–24px
  - Section title (H2): 16–18px
  - Body: 14–16px
  - Metadata: 12–13px (muted)

---

## Spacing & layout
- Use a consistent spacing scale (e.g., 4/8/12/16/24/32).
- Page padding:
  - mobile: 16px
  - desktop: 24px

---

## Component sizing standards
- Buttons: 36–40px height (md)
- Inputs: 36–40px height
- Status pills: compact, single-line, no wrapping
- Tables: row height ~44–52px for readability

---

## Iconography
- Use a single icon library (Lucide recommended).
- Icon-only buttons must have aria-label and tooltip where helpful.

```