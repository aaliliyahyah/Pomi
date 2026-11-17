# Money History reference refinement

Scope: History's filter toolbar, transaction summaries, date groups, entry rows,
empty states, sorting, and transaction menus. The supplied reference guides the
compact grouped layout. Existing React/plain CSS, typography, palette, card
shapes, filter rules, financial forms, data, storage, and ledger calculations
remain in use.

## Changes

- A compact toolbar retains Fund, Entry type, and inclusive From/To controls.
  Narrow layouts pair the select controls and give dates full-width inputs.
- Removable indicators expose active filters. Removing an indicator restores
  focus to its field; Clear all and empty-result recovery restore the Fund
  control. Invalid ranges identify their fields and explain recovery.
- Four filtered flow summaries show allowance received, expenses, savings
  deposits, and withdrawals. Starting balances are explicitly excluded;
  withdrawals combine returns to allowance and spending from savings. These are
  history summaries, with no change to account balances or transaction data.
- Transactions retain grouping by date, with consistent weekday/date headers,
  group counts, optional newest/oldest ordering, icons, category labels, signed
  tabular amounts, and fund/source context. Starting balances remain editable in
  a separate final group. Withdrawals use an outgoing sign from the fund while
  retaining their transfer description.
- History menus have Edit/Delete icons, distinct deletion treatment, native
  popover placement constrained to the viewport, scroll containment, and the
  existing confirmation and keyboard/dialog focus behavior. A successful deletion
  focuses the transaction-list heading. Add transaction opens existing forms.
- Empty and filtered-empty histories retain guidance and next actions. No
  duplicate-transaction feature, schema change, migration, or dependency was
  introduced.

## Scoped self-review

| Domain        | Coverage                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility | Native fields and labels, sort/select keyboard paths, labeled removal controls, status count, date-range field associations, named menu triggers, Escape/dialog focus restoration, and focus after deletion.                                                                               |
| Layout        | Real allowance, expense, deposit, return, savings-spend, and starting-balance entries at desktop, tablet, and 320px; active-filter and no-result captures; long-content and 200% text checks. An inherited flex width limit was removed from History amount cells after visual inspection. |
| Writing       | Filter scopes and summary definitions are explicit. Category labels avoid repeated generic type captions, while transfers retain fund/destination context. Invalid dates and empty states offer recovery.                                                                                  |
| Typography    | Existing Georgia/system fonts and type scale, tabular signed amounts, wrapping long descriptions, full dates in group headings, and one-line ordinary currency figures.                                                                                                                    |
| Color         | Existing peach, blush, mint, burgundy, and neutral tokens. Category text/icon/sign cues accompany color. Browser checks measure category labels against their actual backgrounds and rendered text across all pages.                                                                       |
| UI polish     | Consistent spacing and card/control radii, quiet date-group headers, restrained category labels, and overlay-only shadows. Existing reduced-motion rules remain; no new animation.                                                                                                         |

No outstanding findings in inspected coverage. This scoped self-review does not
certify screen-reader speech or every browser/device combination.

## Verification

- `npm test`: 37 tests passed.
- `npm run build`: passed with the existing JavaScript bundle-size advisory.
- Initial focused History/interface/select run: nine browser tests passed.
- After the amount-width correction, two History scenarios passed, covering
  totals, withdrawals, starting-balance exclusion, filters, removal focus, sorting,
  per-date groups, popup viewport bounds, edit/save, guarded delete, reload
  persistence, empty records, unavailable fund actions, and invalid-date recovery.
- `npm run test:e2e -- --workers=1`: all 28 Chromium tests passed.
- Final mobile empty-state captures: both focused History scenarios passed again
  with captures written separately under `/tmp/pomi-history-empty-verification`.
- Final desktop, tablet, mobile, active-filter, and empty-state captures inspected.
  Category text contrast, rendered application text contrast, popup bounds,
  320px reflow, 200% text enlargement, backups, offline use, and other page flows
  passed the browser suite.
- Prettier and `git diff --check`: passed for the modified source, tests, and
  design documentation.

**Not verified:** screen-reader speech, non-Chromium engines, physical devices,
RTL/pseudo-localization, and OS-level browser zoom. Browser checks cover 320 CSS
pixel reflow and independent 200% text enlargement.
