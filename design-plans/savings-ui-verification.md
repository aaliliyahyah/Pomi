# Savings Funds reference refinement

Scope: Savings Funds page and its dedicated daily savings checklist. The supplied
reference guides the compact fund list, wider selected-fund panel, optional goal
progress, grouped actions, and quiet pastel selection. Existing React/CSS,
Georgia/system typography, semantic colors, card radii, storage, and financial
calculations remain in use. Allowance's combined checklist behavior is unchanged.

## Changes

- New fund and notebook-wide Add Savings sit beside the page heading. The
  selected panel exposes fund-specific Add Savings and Edit fund. Existing
  three-dot fund menus retain withdraw, archive/restore, and guarded delete.
- A blush overview shows total savings and optional combined progress for active
  funds with goals. Goal-free funds are excluded from goal progress; archived
  balances remain included in total savings. Contributions toward each active
  goal are capped at that fund's target for the combined goal indicator.
- Compact cards align name, frequency, balance, and optional goal progress.
  Selection uses a 1px green border, mint background, and pressed button state.
- The selected panel contains optional goal progress and Daily checklist/Fund
  details views. Native progress elements expose monetary progress values.
- Dedicated savings rows omit repeated fund names and icons. Saved, Pending,
  Saving…, No class, and Unavailable labels accompany the existing checkboxes.
  Unavailable rows explain prerequisites without changing availability rules.
- Flexible funds retain manual deposits and any historical fixed-day checklist.
  Goals remain optional in Edit fund → Additional details. Shared period
  selection, selected-fund focus, validation, errors, negative-balance
  confirmations, and rollback behavior are retained.

## Scoped self-review

| Domain        | Coverage                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility | Native headings, buttons, checkboxes, disclosures and progress; named selection and progress; visible existing focus rings; keyboard fund selection/saving; dialog and menu focus restoration.                                                   |
| Layout        | Three funds with fixed/flexible and goal/goal-free content; desktop, tablet, and 320px captures; existing enlarged-text/large-content checks. An inherited overview grid conflict and extra card padding were corrected after visual inspection. |
| Writing       | Short state labels, explicit disabled prerequisites, fund-specific actions, goal scope, and an unambiguous Allowance check-in link.                                                                                                              |
| Typography    | Existing typefaces and scale, tabular amounts, wrapping names and values; summaries use compact system numerals.                                                                                                                                 |
| Color         | Existing pastel and semantic tokens. Browser checks measure rendered text across all pages and all four Savings status color pairs against WCAG AA.                                                                                              |
| UI polish     | Thin selected border, quiet mint state, compact menu actions, existing control shapes and reduced-motion support. No new animations or decorative shadows.                                                                                       |

No outstanding findings in inspected coverage. This scoped self-review does not
certify screen-reader speech or every browser/device combination.

## Verification

- `npm test`: 37 tests passed.
- `npm run build`: passed with the existing bundle-size advisory.
- New browser scenario verifies goals, goal-free funds, fixed and flexible
  savings, disabled and completed states, keyboard saving, recalculated totals,
  fund-specific deposit prefill, dialog focus restoration, and 320px reflow.
- `npm run test:e2e -- --workers=1`: all 25 Chromium browser tests passed.
- Rendered status text contrast passed for Saved, Pending, Unavailable, and No
  class. Shared rendered text contrast, keyboard flow, focus restoration,
  320px reflow, and 200% text enlargement checks passed.
- Final desktop and mobile captures inspected, alongside the tablet capture.
- Prettier and `git diff --check`: passed for the changed source, tests, and
  design documentation.

**Not verified:** screen-reader speech, non-Chromium engines, physical devices,
RTL/pseudo-localization, and OS-level browser zoom. Browser checks cover 320 CSS
pixel reflow and independent 200% text enlargement.
