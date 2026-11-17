# Pomi

## About Pomi

I'm building Pomi as a digital notebook for tracking my allowance and savings. I want a simple place to record money I receive, spend, and put aside, with balances that reflect the entries I make.

I use Pomi as an installable progressive web app (PWA) that works offline without an account.

## Running My App

I use Node.js 22.12 or newer and npm to run Pomi locally:

```sh
npm ci
npm run dev
```

I open the local URL printed in my terminal to go straight to my notebook. New notebooks start with zero balances and a “My savings” fund. I can edit starting balances in History and manage funds in Savings.

For a production build, including offline support, I run:

```sh
npm run build
npm run preview
```

I deploy the generated `dist/` directory to an HTTPS static host when I want to install Pomi on a device. Offline support becomes available after the first successful production load and service-worker activation. The development server doesn't enable the service worker.

I run my automated checks with:

```sh
npm test
npm run build
npm run test:e2e
```

My browser tests use Chromium from `/usr/bin/chromium` when available. Otherwise, I install Playwright's browser with `npx playwright install chromium`. The browser tests cover the production app, including offline reloads and backup restore.

## What I Want to Track

- **Allowance periods:** I enter the daily amount, total money received, and how many days it should last. Each receipt has a dated school-day checklist with daily budgets.
- **Daily savings:** Fixed daily funds have school-day checklists. Flexible funds accept manual deposits whenever I choose.
- **Money taken:** I record allowance expenses or savings withdrawals, including partial amounts, and edit mistakes in History.
- **Existing money:** Starting balances and older records stay available without creating artificial checklist days.

## How I'll Use It

### Receiving and spending allowance

I add allowance in the Allowance tab or through the Home shortcut and enter its daily amount, total received, and number of days. The total can differ from the daily amount multiplied by days. Starting a day captures its daily budget without spending it. I record expenses against that day, and savings and actual expenses each reduce the available balance once. Before unchecking a day, I reassign/delete its expenses and reverse its savings. Historical checked days retain their previous accounting and are labeled accordingly.

I choose a separate school start date and weekdays for each period. No Class skips a dated day without deducting money or adding a replacement day. I reverse any recorded savings and allowance before skipping a day.

Each allowance receipt starts a new period. Earlier periods and unused money remain available. I can edit a period, but completed days keep their original amounts; changing the daily amount affects unchecked days. I must uncheck completed days before removing them.

For example, ₱1,000 received with ₱200 per day and three days creates three daily budgets. Starting a day leaves the overall balance at ₱1,000. Recording ₱25 spent and ₱50 saved leaves ₱125 in that day’s budget and ₱925 available overall.

I use Record expense from Home, Expenses, or a started Allowance day. I can assign an expense to a period and a started day, or leave it outside daily budgets. Expenses shows separate spent and remaining cards and a selected-day breakdown. Pomi asks before creating or worsening a negative daily or overall balance, and keeps my input if I cancel.

### Saving each day

I choose Fixed daily with an amount such as ₱50 or ₱100, or Flexible for manual deposits without daily requirements. Allowance groups each day’s allowance and savings checks together. Each fund’s checklist has the same days as the allowance period. I check the allowance day first, then mark savings when I actually put the money aside. The selected-fund panel in Savings holds the individual checklist. Its period selector shares the Allowance selection, keeping older periods accessible without showing every checklist at once.

For new daily budgets, checking ₱50 saved from a ₱200 day leaves ₱150 before any actual expenses. Savings cannot exceed the day’s remaining allowance. Previously checked historical days retain their original spending/savings split and balances.

Changing a fund's fixed amount affects unchecked savings days. Existing checked savings keep their recorded amounts. I can reverse a savings check unless that would leave the fund below zero after withdrawals.

Add Savings, on the Savings page and each fund, records money outside the daily checklist. I can choose allowance or extra money as its source; allowance-funded extra deposits reduce available allowance separately.

### Taking money out of savings

When I withdraw from a fund, I choose whether to return the money to my available allowance or record it as spent directly from savings. I won't be able to withdraw more than the fund holds.

### Managing funds and correcting entries

I can create and rename funds, change their optional goals, and archive funds while keeping their records. A three-dot menu holds Edit, Withdraw, Archive/Restore, and Delete. I can permanently delete unused funds; funds with financial history must be archived instead.

I can edit or delete incorrect entries, including starting balances. Checklist-generated daily entries open and focus their matching day in Allowance when edited; allowance receipts open their period settings; deleting them reverses their associated checkbox. A period receipt can only be deleted after its completed days and linked expenses are cleared. I confirm before deleting an entry, and my affected balances recalculate after a correction. I don't need a separate audit trail of previous versions.

### Understanding my balances

I want my balances calculated from my recorded entries:

- **Available allowance:** My starting allowance plus money received and savings returned to allowance, minus expenses and allowance-funded savings deposits.
- **Fund balance:** My starting savings in that fund plus deposits, minus money returned to allowance or spent from the fund.
- **Total savings:** The sum of my fund balances, including money still held in archived funds.

I want savings spent directly from a fund recorded once, without also reducing my available allowance.

## My Screens

| Screen    | What I want to do                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------ |
| Home      | See my available allowance, total savings, and recent entries; quickly record allowance or an expense. |
| Allowance | Manage allowance periods and check each day’s allowance and savings.                                   |
| Savings   | View my funds, balances, and optional goal progress; record deposits and withdrawals.                  |
| History   | Browse my entries by date and fund, then edit or delete mistakes.                                      |
| Settings  | Export or restore a backup and manage my app preferences.                                              |

## Interface design

Pomi uses a cream, peach, and rose journal style with mint savings accents with small geometric bow, heart, sparkle, and tape stickers. Functional icons remain labeled and consistent. The visual tokens, navigation rules, and accessibility standards are documented in [DESIGN.md](DESIGN.md).

I can collapse the desktop sidebar to an icon rail using its bottom toggle. Pomi remembers this view preference on this device; mobile navigation stays visible.

## Storage and Backup

I store my records on my device and use Pomi offline after its initial loading. My entries remain available after closing or reloading the app.

Settings lets me set default daily allowance and savings amounts, school weekdays, and optional in-app reminders. Defaults affect new forms only. Reminders need Pomi to be open and start disabled.

I export and restore backups manually from Settings, which shows the most recent export date on this device. Before restoring, Pomi validates the backup and asks me to confirm replacing my current records.

My records won't sync automatically between devices. Clearing browser data can erase them, so I'll use exported backups to keep a separate copy.

## My Technology

- **React and TypeScript:** I use these for the interface and application logic.
- **Vite:** I use this for development and production builds.
- **IndexedDB and Dexie:** I use these for local records and offline access.
- **PWA support:** I use a web app manifest and service worker so I can install Pomi and open it offline.
- **Vitest and Playwright:** I use these to check money calculations, database behavior, and browser flows.

I store PHP amounts as integer centavos to avoid decimal rounding errors. I calculate balances from records and save related changes together so a failed operation doesn't leave partial updates. Changes from multiple tabs use the latest stored notebook.

I keep the application in `src/`, with money rules in `src/model.ts` and database operations in `src/db.ts`. I keep browser tests in `tests/`. I can regenerate my install icons with `node scripts/generate-icons.mjs`.

## First-Version Defaults

- I'll use PHP as the only currency.
- I'll default entry dates to today and allow backdated records.
- I'll enter my existing balances during setup and allow myself to correct them later.
- I'll keep entry details to an amount, date, and optional note, without categories.
- I'll leave accounts, automatic deposits, cross-device sync, and direct fund-to-fund transfers out of the first version.

## How I'll Check It Works

- I'll check that starting balances appear correctly without counting as new income.
- I'll check that allowance receipts and expenses update my available balance correctly.
- I'll check that allowance-funded deposits affect both balances, while extra-money deposits affect only savings.
- I'll check that withdrawals either return money to allowance or record spending from savings correctly.
- I'll check that edits and deletions recalculate every affected balance.
- I'll check that unspent allowance carries forward across week boundaries.
- I'll check that negative allowance triggers a warning and withdrawals exceeding a fund's balance are blocked.
- I'll check that records survive reloads and remain usable offline after the initial loading.
- I'll check that exporting and restoring a backup preserves my entries and balances.

## Project Status

My notebook includes allowance periods, daily allowance and fixed savings checklists, manual expenses and withdrawals, multiple savings funds, optional goals, starting balances, editable history, archiving, offline storage, and backup export and restore. Older notebooks and version 1–3 backups migrate to version 4 without changing their balances, transaction dates, or entries. Previously checked days keep historical accounting; unrecorded and new days use actual spending. New exports use version 4 and require a current Pomi build. Older period schedules are inferred from receipt dates using Monday–Friday and can be corrected in period settings. New checklist transactions use scheduled school dates. I keep my data on this device and don't use accounts or automatic sync.
