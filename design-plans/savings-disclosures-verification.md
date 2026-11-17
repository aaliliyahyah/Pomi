# Savings disclosures and action reveal

Implemented the confirmed layout: Savings now follows Expenses with title/bow,
active-fund/action row, two summaries, then full-width single-open fund rows.
Existing checklist/details choices, deposit/edit actions, and recovery remain.
The no-goal summary includes a static decorative empty track and explanatory
text without fabricated numbers. Model, backup and database behavior are unchanged.

Period controls have transparent outer borders and 16px text padding. At <=600px,
long selected names ellipsize; opening the dropdown exposes the complete name.
Actions share one component with a fixed canvas, rounded clip reveal, icon
translation and opacity transition. The hidden clipped region rejects pointer
activation. Touch labels remain visible and reduced-motion changes are immediate.
New fund uses FolderPlus/outlined styling with a separate circular outline;
Add Savings uses Plus/filled styling. Expanded fund bodies are white.

## Scoped review

- Accessibility: native buttons, named dropdowns, independent menus, aria-expanded
  fund disclosures, stable keyboard focus, and decorative empty-track semantics.
- Layout: desktop/320px rows, shared controls, long names, touch labels, footer
  wrapping, and stable period position during action expansion inspected.
- Writing/type: existing terminology and fonts retained; no-goal instructions
  explain the next action; full truncated text is reachable through the popup.
- Color/polish: existing semantic palette and radii reused; complete outlined
  circle and icon position corrected after rendered inspection. No dependencies.
- Motion reviewer accepted inspected settled states after narrow-name correction;
  continuous temporal quality remains excluded from that disposition.

## Verification

- Production build passed, with existing 500kB chunk advisory (524.57kB main chunk).
- Nine targeted Chromium scenarios passed: recovery at two widths, action reveals,
  touch controls, full-width fund disclosures, and historical checklist behavior.
- Six final action/row cases passed after visual refinements, including exact icon
  positioning, inaccessible clipped region, unchanged neighbor bounds, no-motion
  touch/reduced states, narrow field height, full popup names, accordion selection,
  view defaults, navigation persistence, and goal-free to real-progress transition.
- Inspected before/expanded/reduced and touch captures, plus Savings rows and
  empty-goal cards at desktop and 320px. Artifacts: /tmp/pomi-fund-layout-final,
  /tmp/pomi-disclosures-verified, /tmp/pomi-final-fund-rows.
- Prettier checks and git diff --check passed.

**Not verified:** full browser suite on this revision, continuous animation
smoothness/frame timing and rapid reversal across a frame sequence, manual screen
readers, native browser zoom, RTL and non-Chromium browsers. The unavailable motion
launcher was replaced with sparse Playwright state captures; no smoothness claim
is inferred from them. Scoped verdict: approve inspected settled UI/interaction
coverage, excluding temporal-motion performance.
