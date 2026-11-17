# Allowance UI refinement

Verified November 16, 2026. Scope: Allowance page, its daily controls, and the
shared savings checkbox presentation. The supplied image guided the aligned
daily figures and compact page hierarchy. Existing React/TypeScript, CSS tokens,
Georgia headings, pastel surfaces, and financial operations were retained.

## Changes

- Period selection and editing sit beside the page heading. Three summaries
  explicitly describe notebook-wide balances and spending, rather than implying
  these amounts belong only to the selected period.
- Daily rows align dates, allowance, savings funds, spent, money left, status,
  and actions. Narrow layouts retain source order with visible field labels.
- Pending, Budget started, Completed, and Skipped combine text and icons.
  Completion describes the recorded day and its required savings; it does not
  imply the budget was fully spent. Planned amounts use neutral styling.
- Mark no class is a bordered row action. Started days expose the existing
  prerequisites in How to skip. Saving retains keyboard focus and blocks
  repeated actions; skipped days retain Restore school day.
- Negative balances show both the signed amount and an explicit amount over
  budget. Earlier record explains historical automatic spending in a disclosure.
  Accounting operations, savings limits, confirmations, and backup schemas were
  not changed.

## Scoped self-review

| Domain | Evidence |
| --- | --- |
| Accessibility | Native labeled checkboxes/buttons/disclosures in `src/check-in.tsx`; keyboard skip/restore focus regression test; route, dialog, and custom-select keyboard tests pass. Column labels remain available to assistive technology on desktop. |
| Layout | Populated Allowance visually inspected at 1440px, 768px, and 320px. Tablet amount wrapping corrected. Browser checks cover all six sections, 320px reflow, enlarged text, and large content. |
| Writing | Money left calculation explained once; planned amounts distinguished; No budget and over-budget explanations checked against recorded amounts. Historical explanation tested without changing original balances. |
| Typography | Existing serif headings and system controls retained. Daily monetary figures use tabular numerals; date/fund text wraps rather than truncates. |
| Color | Existing semantic tokens retained. Rendered state-specific text pairs measured: completion 5.79:1, pending 6.20:1, skipped 5.02:1, negative balance 6.27:1, and over-budget explanation 6.95:1. Lowest sampled pair was supporting text on blush at 4.97:1. Application-wide rendered text contrast test also passes. |
| UI polish | Repeated control surfaces and redundant check marks removed in compact rows. Mint/blush states retain text and icons. Existing focus, button, radius, and reduced-motion rules retained. Saving, unavailable, skipped, and error paths inspected through source and browser tests. |

No remaining actionable findings in the inspected scope. This is a scoped
implementation self-review, not a complete accessibility certification.

## Verification

- `npm test`: 37 passed.
- `npm run build`: passed; Vite reports a JavaScript bundle-size advisory
  (502.10 kB before gzip, 151.31 kB gzip).
- `npm run test:e2e -- --workers=1`: all 23 Chromium tests passed.
- Prettier check of changed UI, test, and design files: passed.
- `git diff --check`: passed.

The initial browser run exposed focus loss during skip saving and an obsolete
copy assertion; both were corrected. A preview-server interruption also caused
connection failures in that run. The final full run passed in 1.9 minutes.

**Not verified:** screen-reader speech, other browser engines, physical devices,
RTL/pseudo-localization, and OS-level browser zoom. Automated enlarged-text and
320 CSS-pixel reflow checks passed.
