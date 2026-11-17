# Allowance and selected-fund refresh verification

Implemented the approved screenshot plan in the existing React, TypeScript, CSS,
and IndexedDB stack. Financial entries and backup schema remain unchanged.

- Allowance cards follow the selected period: receipt amount, available outside
  daily budgets, and excluded no-class allowance. Home aggregates available money.
- Daily budget reservations and skips are derived without synthetic expenses.
  Tests cover reversals, idempotency, overspending, unassigned expenses, period
  edits, multiple periods, legacy records, and backup round trips.
- Savings checks are removed from Allowance and retained on Savings. Home retains
  both creation actions in its single remaining balance card.
- Expenses enters with collapsed details. Savings summaries follow the selected
  fund, its period selector precedes the mint frequency panel, view buttons follow
  that panel, and fund details use a native table.

Verification:
- `npm test`: 47 tests passed across 8 files.
- `npm run build`: passed; Vite reports a bundle-size advisory.
- Focused Playwright suites: allowance-refresh and savings-rows, 4 tests passed.
- Expanded allowance-refresh suite: 2 tests passed at 1440px and 320px, including
  all three changed routes with no horizontal overflow at 200% root text size.
- Inspected generated screenshots of Savings, Allowance, and Home at relevant
  desktop/mobile widths. Source review covered native table semantics, checkbox
  naming, existing saving/error guards, focus styles, and retained state labels.
- Keyboard focus and Tab checked in the focused browser suite.
- Computed token contrast: main/muted text on mint 9.91/5.20, peach 8.78/4.61,
  blush 9.46/4.97, and cream 11.20/5.88. Normal text exceeds 4.5:1.
- `git diff --check`: passed.

Not verified: full existing browser suite, actual browser zoom at 200%, screen
reader output, and injected IndexedDB write failures. Text resizing is distinct
from browser zoom. No claim of a complete accessibility audit is made.
