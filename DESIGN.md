# Pomi interface

Pomi is a personal allowance and savings notebook. Its interface should feel like
a cared-for journal while keeping financial actions literal and predictable.

## Navigation and daily work

Home, Allowance, Expenses, Savings, History, and Settings are the six sections.
Desktop uses a labeled side rail with a bottom Collapse/Expand toggle. Collapsed mode is an 80px icon rail with accessible names and hover/focus tooltips. The preference is device-local and excluded from backups. Mobile shows five bottom links (Home, Allowance,
Expenses, Savings, History), with a labeled Settings shortcut above every page.

Home follows the supplied three-summary reference: Available allowance in peach,
Total savings in mint, and Total expenses in blush. Amounts and labels
align across equal-width desktop cards; repeated scope captions are omitted. Add allowance and Record expense remain
compact secondary actions in their summaries. A burgundy Daily check-in action
sits beside this week's scheduled savings days and completion progress. Home
prioritizes a period containing today's scheduled day over a historical period
selected elsewhere; opening check-in focuses the matching allowance day. Skipped,
unscheduled, and setup states have explicit guidance without creating transactions.
Savings funds and Recent activity sit side by side below daily work, stacking in
source order on narrow screens. Home previews up to three active funds, with
balance and optional goal progress, plus All funds and New fund.
Recent activity previews the latest three eligible transactions, with note,
transaction type, signed amount, and date on each row. Existing action menus and
View history retain correction and full-history access. Zero opening balances
are omitted. Narrow layouts preserve balances, daily work, funds, then activity.
The default overview fits typical 768px-high desktop screens; longer previews,
notices, short screens, and enlarged text use normal page scrolling. Navigation
links keep visible focus and 44px targets. The page heading and date share a row
when space permits.

Expenses follows the supplied compact notebook reference. A labeled allowance period
selector shares a compact toolbar with Edit period. Select a day by opening its
dated expense row; there is no separate day dropdown. Four peach, blush,
mint, and neutral balance summaries show selected-day Daily allowance and notebook-wide
Total spent, Saved, and Remaining balance, without repeated scope captions.
Daily expenses is the default when a period exists. Each dated row shows its
status and aligned allowance, spending, savings, and remaining figures. Selecting
a row or day control opens that day's expenses and quick actions. Clicking an open
row closes its detail while retaining the selected day and summary values;
clicking it again reopens it. Selecting another day opens its detail. One Record
expense action lives in the selected row, prefilling a started day; unstarted or
skipped days open the general expense form. Without a period, one general
recording action remains available beside the setup guidance.
Negative daily balances emphasize the signed amount without extra explanatory
notes. Unstarted days retain Start day in Allowance; started and skipped days
have no View day action. Historical accounting is retained without an Earlier
record disclosure. All expenses shows the notebook-wide transaction list. Daily records use explicit assignments,
including historical checklist expenses, rather than inferring from transaction
dates. The selected-day spending caption is omitted; the all-expenses count
remains.

Allowance owns period management and the combined daily check-in. One shared
allowance-period selection controls Allowance and the selected fund checklist. The newest
period is the default; selection survives navigation, and new periods become
selected. Selection is view state, not financial data.

Allowance places its period selector and Edit period between the notebook summaries
and the daily checklist.
Notebook-wide allowance, savings, and spending summaries omit repeated scope
captions. Add allowance sits beside Daily allowance (or in the balance summary
for a notebook with no periods). The instruction and compact period-plan line are omitted above the daily rows.

Daily rows align date, allowance check, fund savings checks, and actions.
Spent, Money left, and Status columns are omitted; daily financial details remain
in Expenses. Narrow layouts use labeled pairs in source order, without
horizontal scrolling. Completed rows use mint; skipped rows use blush and show
static dashes in place of allowance and savings checkboxes. No budget and Planned
captions are omitted. Mark no class / Restore school day remain per-day actions, with their
existing availability rules and errors. Allowance rows have no Record expense
button or How to skip disclosure; day-assigned expenses are recorded in Expenses.
The calculation instruction and Confirm schedule cue are omitted; inferred
schedules retain their explanation in the period editor. Preserve explicit setup,
unchecked, saved, saving, unavailable, and failed states.

Period settings edit the plan, not the daily checklist. Fund forms show name and
fixed daily amount first, with optional details behind a labeled disclosure.
Savings follows the supplied compact fund-list and detail reference. New fund
and the notebook-wide Add Savings action sit beside the heading. A mint summary
shows total savings and optional overall progress toward active fund goals.
The compact fund list sits beside a wider selected-fund panel on desktop and
stacks above it on narrow screens. Each card shows name, balance,
and optional goal progress. Frequency and percentage-of-goal captions are omitted
from fund lists; archived funds retain a visible Archived label. Saving frequency
and goal details remain available in the selected fund panel. A thin green border, mint surface, and
pressed selection button identify the selected fund. Named three-dot menus retain
Edit, Withdraw, Archive/Restore, and guarded Delete without repeating buttons on
every card. Selecting a fund focuses its detail heading; selection survives
navigation and falls back to the first visible fund when filtered or removed.
The selected panel offers Daily checklist and Fund details views as equally sized
bordered, filled buttons without underlines. The selected view uses mint with a
green border; the other uses cream with the standard control border. It also shows goal progress
when configured, a fund-specific Add Savings action, and Edit fund. Funds without
a checklist default to Fund details; fixed funds and flexible funds with
historical day-linked entries default to Daily checklist. Skipped checklist days
show static values instead of disabled checkboxes.
The matching-day checklist instruction and fund-menu direction sentence are
omitted; actual checklist prerequisites and fund actions remain. The inline
period selector shares the Allowance selection. Fixed daily funds have compact
rows with saved, pending, saving, no-class, and unavailable states; disabled rows
retain other prerequisite messages without the “Check allowance first” hint. Flexible funds accept manual deposits. Changing to
flexible preserves earlier fixed-day checks. Optional goals remain in the fund
editor's Additional details section. Transaction actions use the same disclosure
pattern, including Escape dismissal and trigger focus restoration. History follows the supplied compact-filter and grouped-transaction reference.
Fund, entry type, and inclusive From/To filters retain their original matching
rules. Selected values remain visible in their controls; there is no active-filter
chip row. A standalone Clear all button appears when filters are active and
restores focus to Fund. Invalid date ranges identify the fields and show a recoverable
error. Four summaries reflect filtered allowance receipts, expenses, savings
deposits, and withdrawals; starting balances are excluded from these flow totals.
Withdrawals combine returns to allowance and money spent from savings, and show
an outgoing sign from the fund without changing ledger calculations.
Transactions group by date with weekday/date formatting, without per-date counts.
The overall Transactions count and accessible result announcements remain. Newest/oldest
sorting is view state; editable starting balances remain in a separate final
group. Icons, short category labels, signed tabular amounts, and fund/source
context distinguish transaction types. Edit/delete menus use a viewport-bounded
native popover, retain confirmation and dialog focus restoration, and return
focus to the list heading after a successful deletion. The History Add transaction menu is omitted; creation actions remain on their
existing task pages. History totals sit directly below the page heading and above
the borderless white filter surface. Filters retain visible field labels and an
accessible section name, without a visible Filter history heading. Zero starting
balances are omitted from Recent activity. History links checklist records back
to their corresponding day in Allowance and focuses it.

## Visual language

- Warm cream background, white surfaces, peach allowance panels, blush savings panels, rose actions and selection, and mint completion accents.
- Content fills the workspace with 32px desktop, 24px tablet, and 16px mobile gutters.
  Home groups three balance summaries above daily work, then pairs compact fund
  and activity previews, stacking in source order when needed.
- Forms share 48px controls, 16px text, consistent chevrons, and one focus ring for money inputs. Balances use bold Lora text, matching the rest of the interface.
- Lora throughout: headings, logo, controls, fund names, labels, financial values, and body text. The shared font tokens use locally bundled normal variable Lora (400–700), with Georgia/Times New Roman/serif fallbacks. Lora does not contain the Philippine peso sign, so a locally bundled Noto Serif subset supplies only U+20B1 (₱). Latin, extended Latin, and the peso-only WOFF2 files are precached for offline use; only primary Latin is preloaded. Font sources and licenses are recorded beside the files under `public/fonts/`.
- Shared font tokens: 16px base and inputs, 14px supporting text, 13px small captions, and bold 32px summary amounts. Unitless line
  heights; tabular money figures; wrap long names and balances.
- An 8px spacing scale for grouping, 16px surface radii, and 12px control radii.
- Separate groups with space first. Use borders for controls and structural
  separators; reserve shadows for overlays and notifications.
- Small geometric SVG bow, heart, sparkle, and tape stickers decorate headings,
  empty states, and the check-in edge. Decorative SVGs ignore pointer input and
  are hidden from assistive technology. Lucide supplies functional icons.
- The journal details never cover financial content or become controls.

## Semantic colors

The source of truth is `:root` in `src/style.css`.

| Role              | Value     |
| ----------------- | --------- |
| Background        | `#FFF8EE` |
| Surface           | `#FFFFFF` |
| Main text         | `#403535` |
| Secondary text    | `#705D56` |
| Primary action    | `#98455F` |
| On primary action | `#FFFFFF` |
| Primary soft      | `#F6E1E6` |
| Blush             | `#F6E1E6` |
| Rose accent       | `#98455F` |
| Focus             | `#98455F` |
| Hover             | `#F0D3DC` |
| Disabled surface  | `#F1E9E2` |
| Separator         | `#DDC9BD` |
| Control boundary  | `#9A8175` |
| Destructive text  | `#9C382F` |
| Peach panel       | `#F8D8C4` |
| Completion        | `#35634E` |
| Completion soft   | `#E3EEE5` |
| Primary hover     | `#80374F` |

Use semantic tokens rather than copying literals into components. Normal text
must reach 4.5:1, large text 3:1, and required control boundaries 3:1 against the
rendered adjacent surface. Decorative colors are never the sole state cue.

## Interaction and access

Use native buttons, links, inputs, checkboxes, disclosures, and dialogs. Branded single-select comboboxes use a native select proxy for FormData and validation, and a keyboard-operated listbox popup for their visible interaction.
Provide visible keyboard focus, skip navigation, route titles, focus on route
changes, and restoration after dialogs close. Keep status regions mounted and
announce successful saves politely. Success notices occupy a shared inline status region above page content, with a dismiss control and the existing five-second timeout. The region stays mounted and is visually empty when idle. There is no persistent page footer or connection badge. Notices never float over checklists or controls; the sidebar has no storage-status indicator; Settings explains device-local storage.
Errors and notifications requiring an action stay until dismissed or resolved;
retain form values after failure.

Aim for 44px controls. Reflow at 320px and 200% zoom. Reserve space around bottom
navigation and allow dialogs to scroll without scrolling the page behind them.
Buttons may scale to 0.96 on press for 150ms only when reduced motion is off.
No animated stickers, confetti, remote fonts, or runtime image services.

## Preservation

Presentation changes must preserve centavo-based accounting, checked amounts,
negative-balance confirmations, savings limits, editable records, offline use,
and existing notebook/backup compatibility.

## School schedules and preferences

Allowance periods store a school start date, selected weekdays, and a calendar
date for every numbered school day. Show dates first and day numbers second.
Receipt dates remain separate. Existing schedules are inferred from receipt dates
using Monday–Friday; their explanation remains in period settings until confirmed.
Schedule correction never rewrites existing transaction dates or checked amounts.
New checklist entries use their scheduled school date.

No Class keeps the date, creates no budget, and does not extend the schedule.
Reassign/delete assigned expenses and reverse savings before unchecking and
skipping a started day. Allowance displays Pending, Budget started, Completed, and Skipped; the model's
existing status rules are preserved. Completed means the day was started and its
required savings have been recorded, not that all of its money was spent.
Completion requires the fixed funds captured when
the day was started; flexible funds add no requirements.

Version 4 days explicitly use actual or legacy accounting. Starting an actual day
captures its configured budget without creating an expense or deducting cash.
Remaining daily allowance is captured allowance minus assigned expenses and daily
savings. Expenses and savings reduce the overall ledger once. Manual expenses may
carry allowancePeriodId and allowanceDayNumber; date changes never infer or move
assignments. Actual expense edits/deletions recalculate budgets. Savings cannot
exceed a day’s remaining budget. Creating or worsening negative daily/overall
balances requires one combined confirmation; cancellation saves nothing.

Migration keeps previously checked days in legacy mode with all transaction
amounts/dates/IDs and balances unchanged. Previously unrecorded days and new days
use actual accounting. Historical days retain their old automatic-spending split,
including after unchecking/rechecking. These days have no Earlier record
disclosure. No old manual expense is automatically assigned to a day.

The daily Expenses view defaults to today if scheduled, otherwise the first
non-skipped day, and resets on period change. Explicit day selection survives
navigation. Allowance owns the scheduled daily check-in.

Preferences prefill new allowance and fund forms without changing old records.
Optional reminders appear in-app after a configurable local time, defaulting to
5 PM, for today's outstanding fixed savings. They require Pomi to be open and may
be dismissed for the day. Reminders are off by default; no notification service
or permission is needed.

Notebook and backup version 4 preserve version 1–3 import compatibility. The last
export timestamp and reminder dismissal are device-local metadata, not restored
financial data. Export feedback describes download initiation; restore success
is announced only after the replacement transaction commits. Settings warns that
clearing browser data may permanently delete records.

## Dashboard references

The supplied Home reference establishes the current three-summary row, daily
check-in beside weekly savings progress, and balanced fund/activity previews.
Earlier balance-pair references are superseded for Home. The Expenses section
handles daily expense detail; the Allowance task list has no duplicate weekly
panel. HoneyBunny informs warm grouped surfaces; CryptoCandy
informs restrained spacing and hierarchy. The accepted palette combines cream,
peach, and rose with mint savings accents. Shared palette changes reach all
pages. The dashboard and Expenses navigation use the same established components
and tokens; historical financial data remain unchanged; version 4 adds explicit day accounting and manual expense/day links. Hover surfaces use main text, since rose text
on the hover pink measures just below 4.5:1.

The current dashboard grouping also draws on the inspected Dribbble references:
[Colorful Dashboard by Salman Khan](https://dribbble.com/shots/16634777-Colorful-Dashboard)
for asymmetric pastel groupings, and
[Shelfton by Pineapple Design](https://dribbble.com/shots/17344932-Shelfton-Library-Management-Dashboard)
for clear separation between focused tasks and compact supporting content.
These are layout references; no reference assets, charts, or account widgets
are copied into Pomi.

The finance surfaces also use [Finance Dashboard – Budget & Savings Web App UI](https://dribbble.com/shots/27614431-Personal-Finance-Dashboard-Budget-Savings-Web-App-UI)
for clear separation between account summaries, active budget tasks, and
supporting savings details, and [Finance dashboard by K&Z Design](https://dribbble.com/shots/27713262-Finance-dashboard)
for quick scanning of key metrics. These guide hierarchy only; Pomi keeps its
existing colors, content, and controls.

## Checklist layout references

The Allowance revision uses [HabitEase’s list-and-progress grouping](https://dribbble.com/shots/26341035-HabitEase-Dashboard-UI-UX) and the [Habit Tracker dashboard concept’s task/statistics separation](https://dribbble.com/shots/26407395-Habit-Tracker-Dashboard-UX-UI-Concept) as structural references. Pomi retains its palette, typography, and existing controls; the version 4 spending rules above govern daily budgets.

## Layout refinement

Allowance period selectors have room for the full name, formatted receipt date,
and amount; Edit period wraps below when necessary. Desktop restore actions have
at least 208px of column space, nonshrinking icons, and 16px horizontal padding.
Expanded expense details use 24px padding and a 32px desktop column gap; records
receive the larger column and actions at least 240px. Narrow layouts stack these
sections with 24px separation. Summary scope captions are omitted throughout;
field instructions, errors, empty-state guidance, and page subtitles remain.

## Recent page layout adjustments

Allowance and Expenses show their summary cards immediately after the page title.
Allowance period controls follow the summaries. Expenses always shows expandable
daily records and the full notebook expense list, with a day-prefilled recording
action in each expanded day and a general recording action in the full list.
The expense view toggle is removed. Expense day details use the full width for
records. The shared dialog width is 720px maximum with viewport gutters. Savings
total and overall goal progress use separate cards. Fund view choices are
bordered buttons with a mint selected state. Expenses period controls have no
outer border.

## Shared financial summaries and period controls

Financial summaries on Home, Allowance, Expenses, Savings, and History use the
same text-only composition: label above amount, an 8px gap, 24px padding, 16px
radius, and content-driven height with a 124px minimum. Sibling cards align;
existing actions sit beneath their amounts. Optional goal panels retain their
progress layout. Summary groups have three or four columns on wide screens,
two columns at 1100px and below, and one column at 480px and below. Long amounts
wrap without clipping.

Summary category tokens map allowance to peach, savings to mint, spending to
blush, and remaining balances or withdrawals to a neutral surface. Rose remains
the action color and green remains the completion color; negative values use
the existing danger treatment.

Allowance and Expenses period fields are capped at 32rem, with their label
above the selector and Edit period aligned to the field's bottom edge. Controls
have at least 48px height and a 16px gap, stacking at 600px and below. Savings'
standalone period label and selector align within the selected-fund panel.
