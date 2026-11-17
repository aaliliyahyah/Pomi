# Header and fund-view refinements

Implemented the confirmed header, modal-field, Savings panel restoration, and
filled delete-button requests. No notebook, backup, accounting, or recovery-model
changes were made; version 5 and archived/deleted fund management remain intact.

## Changes and scoped review

| Domain        | Implemented and inspected                                                                                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | Header selectors reuse the named keyboard combobox and menu; Edit period opens the selected editor and restores menu focus. Restored fund views expose pressed states. Existing native inputs and dialog behavior remain.                                                        |
| Layout        | Period name/chevron and adjacent three-dot menu sit below each title; lower toolbars and Expenses date badge are removed. Name and menu centers align after removing inherited selector margin. Popup minimum width stays within viewport. Inspected desktop and 320px captures. |
| Writing       | Names alone appear in header triggers/options. Fund forms show Goal amount and new-fund Already saved directly, without Additional details. Guidance now points directly to Edit fund.                                                                                           |
| Typography    | Header names and page headings use Lora. Restored Balance/Goal financial fields retain the money stack. Body and controls retain DM Sans.                                                                                                                                        |
| Color         | Filled destructive buttons use separate #B13E4E / #9F3444 action tokens with white text. Browser tests measure at least 4.5:1 in default, hover, and focus states. Error and negative-balance tokens remain unchanged.                                                           |
| UI polish     | Existing popup surface, selected pink row/checkmark, icons, radii, and focus indicators are reused. Savings again has Daily checklist / Fund details buttons and Add Savings / Edit fund footer actions. No motion added.                                                        |

Fixed/history-bearing funds default to Daily checklist; other flexible funds
default to Fund details. Fund selection and eligibility reset the view, while
navigation preserves it. Savings period selectors retain detailed labels;
Expenses All expenses remains notebook-wide.

## Verification

- Unit tests: 43 passed.
- Production build passed; existing chunk-size advisory remains.
- Focused browser suite: 9 passed (checklists, daily spending, financial summaries,
  responsive views, header menus/forms/colors, and restored Savings behavior).
- Additional Home/notebook/header regression suite: 10 passed.
- Final header geometry and popup-bound checks on the final build: 2 passed at
  1440px and 320px. The two broader suites cover 17 distinct browser scenarios;
  these final two repeat the header cases after the margin correction.
- Prettier checks and `git diff --check`: passed.
- Artifacts: `/tmp/pomi-header-refinement`, `/tmp/pomi-header-regression`, and
  `/tmp/pomi-header-final`.
- Verdict: Approve for the inspected scope; excluded coverage is listed below.
- Rendered desktop/mobile header, delete-dialog, and restored Savings captures
  inspected. No remaining actionable findings in the inspected scope.

**Not verified:** full browser suite on this revision, manual screen-reader
announcements, native 200% browser zoom, non-Chromium browsers, and RTL. Existing
focused coverage includes 320px reflow and independent 200% text enlargement.
