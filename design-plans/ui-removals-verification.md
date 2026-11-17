# Selected UI removals

Scope: the ten pictured elements and the approved removal plan. Earlier page
verification documents describe prior versions; this document records the
current removal scope.

## Changes

- Allowance rows no longer contain How to skip, its explanation, per-day Record
  expense, or Earlier record. Mark no class / Restore school day, prerequisites,
  error handling, and checkboxes remain.
- Allowance and Expenses retain signed negative values and their existing color
  emphasis without separate over-budget notes. Confirmation dialogs, cancelled
  input, historical accounting, and all financial calculations remain.
- Expenses retains Record expense and Start day in Allowance for unstarted days.
  Started/skipped days no longer have View day in Allowance; Earlier record is
  removed.
- Savings omits the matching-day checklist instruction and fund-menu direction
  sentence. Actual fund actions, saving modes, and disabled-state reasons remain.
- History omits filter chips and their label, the totals explanation paragraph,
  and per-date transaction counts. Selected filter values, standalone Clear all,
  empty-result recovery, sorting, totals, and accessible result announcements
  remain.
- Removed orphaned styles and the unused DailyCheckIn recording callback and
  skip-help accessibility reference. Narrow Allowance action rows now use one
  column. Existing form schemas, storage, and accounting code were not modified.

## Scoped self-review

| Domain               | Coverage                                                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility        | Removed orphaned described-by reference; retained native disabled states, focus styles, labelled filters, Clear all focus restoration, live counts, confirmation dialogs, and keyboard paths through Expenses.                                           |
| Layout               | Allowance's remaining action fills the narrow row; removed controls and helper text leave no spacer containers; History keeps compact standalone clearing and spacing between totals and the list. Desktop/mobile captures inspected after verification. |
| Writing              | Pictured labels, explanations, and disclosures removed; unrelated error messages, pending-day guidance, and dialog wording retained.                                                                                                                     |
| Typography and color | Existing fonts, tokens, numerical formatting, and negative amount emphasis retained; no new color pairs introduced.                                                                                                                                      |
| UI polish            | Existing card/control styling retained. Removed obsolete rules rather than hiding controls with CSS.                                                                                                                                                     |

No outstanding findings in the inspected removal scope. Screen-reader speech
and other browser engines are **Not verified**.

## Verification

- `npm test`: 37 tests passed.
- `npm run build`: passed with the existing bundle-size advisory.
- Updated browser scenarios exercise assigned recording through Expenses,
  retained negative amounts and confirmations, historical balances, skip
  restrictions, filtering through the controls, Clear all, and removed elements.
- `npm run test:e2e -- --workers=1`: all 28 Chromium browser tests passed.
- Allowance, Expenses, Savings, and filtered History captures inspected at
  desktop and 320px widths. Removed elements leave no empty action columns or
  helper containers. Existing reflow, 200% text enlargement, rendered contrast,
  offline, backup, and financial correction checks passed.
- Prettier and `git diff --check`: passed for the changed source, tests, and
  design documentation.

## Additional text removals

- Removed Check allowance first from the shared daily control in Allowance and
  Savings. Missing-budget checkboxes remain disabled. Empty hint nodes and their
  described-by references are omitted; error descriptions and other prerequisite
  messages remain.
- Removed the selected-day spending caption from Expenses. The all-expenses
  count remains, with a stable status region that is empty in daily view.
- Build passed with the existing bundle-size advisory. All 12 affected Chromium
  checks passed, including saving prerequisites, expense calculations, keyboard
  flow, negative-balance confirmations, historical balances, 320px reflow, text
  enlargement, and rendered contrast. Expenses desktop and Allowance/Savings
  mobile captures inspected; no blank hint rows or caption spacers remain.
- Prettier and `git diff --check` passed. Screen-reader speech and non-Chromium
  engines remain **Not verified**.
