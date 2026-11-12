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

I open the local URL printed in my terminal to set up my starting balances and first savings fund.

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

- **Allowance:** I record the amount whenever I receive money.
- **Expenses:** I record what I spend from my available allowance.
- **Savings funds:** I keep separate balances for different purposes, with an optional goal for each fund.
- **Starting balances:** I enter the allowance and savings I already have without counting them as new income.
- **Entry details:** I record an amount and date, with an optional note.

## How I'll Use It

### Receiving and spending allowance

I add allowance manually when I receive it. My unspent balance carries forward between weeks instead of resetting automatically.

If an expense or savings deposit would make my allowance negative, I want a warning and the option to record it anyway so my notes can reflect what actually happened.

### Adding savings

I choose a fund and record how much I put aside. For each deposit, I choose its source:

- **Allowance:** I reduce my available allowance and increase the fund's balance.
- **Extra money:** I increase the fund's balance without changing my allowance.

I record deposits whenever I save. I don't need a school calendar, daily targets, or required deposits.

### Taking money out of savings

When I withdraw from a fund, I choose whether to return the money to my available allowance or record it as spent directly from savings. I won't be able to withdraw more than the fund holds.

### Managing funds and correcting entries

I can create and rename funds, change their optional goals, and archive funds while keeping their records.

I can edit or delete incorrect entries, including starting balances. I confirm before deleting an entry, and my affected balances recalculate after a correction. I don't need a separate audit trail of previous versions.

### Understanding my balances

I want my balances calculated from my recorded entries:

- **Available allowance:** My starting allowance plus money received and savings returned to allowance, minus expenses and allowance-funded savings deposits.
- **Fund balance:** My starting savings in that fund plus deposits, minus money returned to allowance or spent from the fund.
- **Total savings:** The sum of my fund balances, including money still held in archived funds.

I want savings spent directly from a fund recorded once, without also reducing my available allowance.

## My Screens

| Screen   | What I want to do                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Home     | See my available allowance, total savings, and recent entries; quickly record allowance or an expense. |
| Savings  | View my funds, balances, and optional goal progress; record deposits and withdrawals.                  |
| History  | Browse my entries by date and fund, then edit or delete mistakes.                                      |
| Settings | Export or restore a backup and manage my app preferences.                                              |

## Storage and Backup

I store my records on my device and use Pomi offline after its initial loading. My entries remain available after closing or reloading the app.

I export and restore backups manually from Settings. Before restoring, Pomi validates the backup and asks me to confirm replacing my current records.

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

I've implemented the first version of my notebook: manual allowance and expense entries, multiple savings funds, optional goals, starting balances, editable history, archiving, offline storage, and backup export and restore. I keep my data on this device and don't use accounts or automatic sync.
