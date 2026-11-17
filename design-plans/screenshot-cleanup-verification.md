# Screenshot-requested layout and interaction cleanup

Scope: the seven accepted requests covering Allowance, Expenses, Savings, and
History. This supersedes earlier verification descriptions for these specific
behaviors; unrelated interface and financial behavior remain outside this change.

## Changes

- Wider allowance period toolbar with formatted receipt dates and wrapping Edit
  period; desktop day actions reserve 176px and keep their icons from shrinking.
- Expanded expense details use 24px padding, a 32px desktop column gap, a wider
  records column, and stacked sections on narrower screens.
- Removed the schedule cue, allowance instruction and plan line, No budget and
  Planned captions, summary scope captions, History Add transaction menu, and
  visible Filter history heading. Errors, field hints, page subtitles, and
  actionable empty states remain.
- No-class allowance and fund checklist rows render static values instead of
  checkboxes; restoring the school day restores its normal controls.
- Expense detail toggles independently of selected-day summary data. Selecting
  another row or using the day selector opens that day's detail.
- Funds without checklist eligibility default to Fund details. Fixed funds and
  flexible funds with historical day-linked entries default to Daily checklist;
  changing eligibility resets the selected fund's default appropriately.
- History totals precede the filters. The white filter surface has no outer
  border or visible heading and uses four desktop columns, two tablet columns,
  and one mobile column. Individual field boundaries and focus remain.
- No dependencies, ledger operations, stored schemas, or backup formats changed.

## Scoped review

| Domain        | Coverage                                                                                                                                                                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | Native buttons and checkboxes retained; static skipped-day values have no misleading input semantics. Expense toggles expose expanded state and preserve keyboard activation. Filters retain an accessible section name and labeled fields. Browser checks exercise skip/restore, disclosure, dialog focus, and keyboard routes. |
| Layout        | Supplied screenshots traced to their runtime owners. Desktop and 320px rendered Allowance, Expenses, History, and fund-detail captures inspected; 1024px Expenses inspected. Automated coverage also checks 768px, 1024px, long content, and text enlargement.                                                                   |
| Writing       | Requested labels and summary captions removed; field instructions, errors, setup guidance, and real status labels preserved.                                                                                                                                                                                                     |
| Typography    | Existing fonts and tabular money figures retained; period dates use the established en-PH month/day/year format. Long selector text wraps.                                                                                                                                                                                       |
| Color         | Existing semantic tokens retained; browser tests measure rendered text contrast against the applicable thresholds across all six pages and savings status variants.                                                                                                                                                              |
| UI polish     | Existing surfaces, radii, icons, and motion retained. Whitespace separates expense records and quick actions; removed filter border is not replaced with a shadow.                                                                                                                                                               |

No remaining actionable findings in the inspected change scope. This is not a
full application accessibility audit. **Not verified:** manual screen-reader
announcements, native browser zoom at 200% (CSS-width reflow and independent 200%
text enlargement are covered), and non-Chromium browsers.

## Verification results

- `npm test`: 37 tests passed across 6 files.
- `npm run build`: passed. Existing bundle-size advisory remains (518.79 kB
  before gzip, 155.06 kB gzip).
- All 32 Chromium scenarios have successful runs across the full and focused
  executions. The first full run had 29 passes, an obsolete copy assertion
  (corrected), and two browser crashes. The single-worker rerun verified the
  updated fund, expense, keyboard, contrast, and storage scenarios before its
  process ended; the subsequent focused run passed 14 of 16, with the remaining
  two failing during trace-file teardown rather than product assertions.
- Final isolated rerun: 3 of 3 passed, covering skip/restore, desktop/tablet/mobile
  layouts, a single-line Restore school day label at desktop, long content, and
  320px reflow with independent 200% text enlargement. Output is under
  `/tmp/pomi-cleanup-final`.
- Prettier checks of changed UI, tests, and design documentation: passed.
- `git diff --check`: passed.

Verdict: Approve for the inspected change scope. No single uninterrupted full
browser run passed; the successful checks above were completed across runs.

## Continuation verification — November 16, 2026

Closed the uninterrupted browser-run gap above. Updated browser tests to scope
recording actions, transaction menus, and row counts to Selected day expenses or
Expense records, matching the current interface. The no-class check now verifies
that the selected day has no expense entries while notebook records remain.
Home fixtures use explicit creation times on each entry's date so transaction
ordering does not depend on execution speed or random identifiers. The shared
menu helper supports a section locator as well as a page. No product source,
financial behavior, dependencies, or storage formats changed during continuation.

- `npm test`: 37 tests passed across 6 files.
- `npm run build`: passed; existing bundle-size advisory remains (518.61 kB
  before gzip, 154.96 kB gzip).
- Final TypeScript check after helper and fixture corrections: passed.
- `npm run test:e2e -- --workers=1 --output=/tmp/pomi-plan-complete`: all 32
  Chromium scenarios passed in one uninterrupted run (2.6 minutes).
- Prettier checks of the six changed browser test/helper files: passed.
- `git diff --check`: passed.

Earlier continuation runs exposed outdated selectors, nondeterministic fixture
ordering, a browser-context crash, and an intermediate helper error. Those runs
are superseded by the final successful full run. Browser execution required
permission outside the sandbox to start the local server and Chromium.

The previously listed **Not verified** coverage remains excluded; this
continuation did not add manual visual or assistive-technology inspection.
