# Dashboard organization and palette verification

## Implemented scope

Home now follows the approved compact balance-pair and weekly-panel reference.
The approved cream, peach, and rose palette, with mint completion accents, applies
through shared semantic tokens across Pomi. Other pages retain their layout and
financial behavior. Existing working-tree changes were preserved.

Home groups its heading, peach allowance/blush savings balances, one white weekly
panel, secondary money actions, Recent Activity, and compact fund summaries. The
weekly panel owns the primary check-in action. The separate totals strip and
duplicate shortcuts were removed, including the empty activity check-in link.

## Derived progress

The weekly view uses only the selected period's scheduled dates in the local
Monday–Sunday week. Markers retain full accessible dates/statuses and focus the
matching Allowance day. No Class remains labeled but is excluded from targets.
The peso target uses saved deposit amounts for completed requirements and current
daily amounts for outstanding requirements. Manual deposits and other periods do
not inflate the tracker. Targets reached/exceeded, missing periods, unscheduled
weeks, flexible-only funds, and all-skipped weeks have explicit states. No stored
data, backup format, or accounting API changed.

## Self-review

| Domain        | Evidence and result                                                                                                                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | Native links/progress, named date markers, keyboard-to-day focus, 44px marker targets, visible focus, and existing dialog/route paths verified in Chromium.                                                                                                                                          |
| Layout        | Home screenshots inspected at 320px, 768px, 1440px, and an empty 1920px dashboard. All five routes pass overflow checks at tested mobile/tablet/desktop widths and independent 200% text sizing. Balance labels/values align using shared grid rows.                                                 |
| Writing       | School-day count, daily savings amounts/targets, manual-deposit exclusion in the model contract, No Class, missing targets, setup, and empty activity actions checked.                                                                                                                               |
| Typography    | Georgia page headings retained; Home balances use compact bold system text and tabular numerals. Caption sizes and long amount wrapping follow the existing scale.                                                                                                                                   |
| Color         | Rendered text contrast across all five populated routes passes. New peach, mint/completion, primary action, focus, control, and hover pairs checked. Rose text on hover pink measured 4.49:1, so hover labels use the darker main text. Day-marker boundaries measure above 3:1 on the neutral fill. |
| UI polish     | Shared radii, restrained pastel surfaces, rose primary actions, mint/green completion, distinct transaction colors, and existing disabled/error/reduced-motion treatment checked. No unrelated dashboard widgets were added.                                                                         |

No remaining actionable findings were identified within this inspected scope.

## Checks

- `npm test`: 33 tests pass, including four weekly aggregation cases covering
  partial/complete/exceeded targets, changed rates, manual deposits, skips,
  flexible funds, and dates outside the selected week.
- `npm run build`: TypeScript, production bundle, and PWA generation pass.
- `npm run test:e2e`: 14 tests pass, including target values, marker keyboard
  focus, empty/zero-target states, existing accounting, backup/restore, offline,
  contrast, reflow, and navigation flows.
- A focused rerun covers the final all-No-Class explanatory state.
- Prettier and `git diff --check` pass for the modified files.

**Not verified:** physical Safari/iOS and other browser engines, screen-reader
speech, OS-level browser zoom, RTL/pseudo-localization, and a complete WCAG audit.
Chromium's 320 CSS-pixel reflow and independent 200% text enlargement were tested.
Fixed mobile navigation appears at the capture viewport's lower edge in full-page
screenshots; content remains scrollable with reserved bottom clearance.
