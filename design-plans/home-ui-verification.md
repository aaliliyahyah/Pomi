# Home Dashboard reference refinement

Scope: Home's balance summaries, daily check-in entry point, weekly savings
preview, active fund preview, and Recent activity. The supplied reference guides
layout, grouping, palette roles, and density. Existing React/plain CSS, Georgia
and system fonts, card shapes, pastel tokens, financial forms, menus, storage,
and transaction calculations remain in use.

## Changes

- Available allowance, Total savings, and Total expenses share three aligned
  desktop summary cards in peach, blush, and mint. Compact secondary actions
  preserve Add allowance and Record expense. Negative allowance retains an
  explicit below-zero label and danger text.
- Daily check-in is the primary burgundy action. Home prioritizes the newest
  period scheduled for today, even when a historical period is selected
  elsewhere. The action opens and focuses the matching day; no transaction is
  created by opening it. Skipped, unscheduled, and setup states retain guidance.
- Weekly progress reuses the existing scheduled-day and completion calculations.
  Compact weekday links open the corresponding allowance day. The compact bar
  represents completed savings days, with an accessible name and visible count.
- Up to three active funds show name, balance, frequency, optional goal progress,
  and goal-free state. All funds retains full-list access; New fund opens the
  existing form. Existing schemas, balances, and savings modes are unchanged.
- The latest three eligible transactions have signed amounts and individual
  dates, preserving existing date/creation ordering and zero-opening exclusions.
  Existing edit/delete menus remain available; View history opens all records.
  Other pages retain their existing transaction lists and date grouping.

## Scoped self-review

| Domain        | Coverage                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility | Native action links/buttons, named daily/weekly regions, named progress, decorative icons hidden, existing visible focus, route/day focus, transaction menus, and dialog restoration. Home has no checkboxes; financial check-in remains in Allowance. |
| Layout        | Desktop, tablet, and 320px captures with realistic values and multiple funds; existing large-content and 200% text checks. Inherited label justification and weekly bottom margin corrected after inspection.                                          |
| Writing       | Clear scopes, today/day/completion context, setup and no-school guidance, optional goal state, and per-transaction dates.                                                                                                                              |
| Typography    | Established heading/body fonts and scale, tabular numerals, compact metadata, wrapping amounts and long fund/transaction names.                                                                                                                        |
| Color         | Existing peach/blush/mint/burgundy tokens and explicit negative balance text. Rendered text and required token contrast checks cover Home.                                                                                                             |
| UI polish     | Consistent spacing, thin structural borders, compact secondary actions, one primary daily task, and existing reduced-motion support. No new dependencies, illustrations, animation, or decorative shadows.                                             |

No outstanding findings in inspected coverage. This scoped self-review does not
certify screen-reader speech or every browser/device combination.

## Verification

- `npm test`: 37 tests passed.
- `npm run build`: passed with the existing JavaScript bundle-size advisory.
- Focused Home/dashboard/interface browser run: all 11 tests passed before the
  final label/margin/typography refinements.
- New Home scenario checks exact allowance/savings/expense totals, the three-fund
  and three-transaction limits, signed/date-labelled activity, weekly completion,
  keyboard check-in focus, full-fund access, and today's period after explicitly
  selecting a historical period.
- Full Chromium regression run: 25 of 26 scenarios passed; the remaining test
  referenced Home's removed left-column wrapper. After updating that assertion
  to the fund-preview panel, all three Expenses scenarios passed in a focused
  rerun. All 26 distinct browser scenarios are verified against the final product.
- Final desktop, tablet, and 320px captures inspected. The compact desktop check,
  rendered contrast, independent 200% text enlargement, setup, goals, savings,
  backups, offline access, and financial correction flows passed.
- Prettier and `git diff --check`: passed for the changed source, tests, and
  design documentation.

**Not verified:** screen-reader speech, non-Chromium engines, physical devices,
RTL/pseudo-localization, and OS-level browser zoom. Browser checks cover 320 CSS
pixel reflow and independent 200% text enlargement.
