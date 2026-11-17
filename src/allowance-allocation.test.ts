import { expect, it } from "vitest";
import {
  allowanceAllocation,
  availableAllowance,
  dailyBalance,
  emptyNotebook,
  exportBackup,
  importBackup,
  makeEntry,
  savePeriod,
  setAllowanceDay,
  setNoClass,
  setSavingsDay,
  withEntry,
} from "./model";
function fixture() {
  return savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "f",
          name: "Fund",
          goal: 150000,
          archived: false,
          savingMode: "fixed",
          dailyAmount: 5000,
        },
      ],
    },
    {
      id: "p",
      total: 100000,
      dailyAmount: 20000,
      dayCount: 5,
      date: "2026-11-16",
      note: "School",
    },
  );
}
it("reserves budgets once, tracks skips, restores them and round trips", () => {
  let book = setAllowanceDay(fixture(), "p", 1, true);
  expect(availableAllowance(book)).toBe(80000);
  book = withEntry(
    book,
    makeEntry("expense", 3000, {
      allowancePeriodId: "p",
      allowanceDayNumber: 1,
    }),
  );
  book = setSavingsDay(book, "p", 1, "f", true);
  expect(dailyBalance(book, book.periods[0], 1).remaining).toBe(12000);
  expect(availableAllowance(book)).toBe(80000);
  book = setNoClass(book, "p", 2, true);
  expect(allowanceAllocation(book, book.periods[0])).toMatchObject({
    given: 100000,
    available: 60000,
    noClass: 20000,
  });
  expect(setNoClass(book, "p", 2, true)).toEqual(book);
  expect(importBackup(exportBackup(book))).toEqual(book);
  book = setNoClass(book, "p", 2, false);
  expect(availableAllowance(book)).toBe(80000);
});
it("releases unchecked budgets and deducts overspending and unassigned expenses", () => {
  let book = setAllowanceDay(fixture(), "p", 1, true);
  book = setAllowanceDay(book, "p", 1, false);
  expect(availableAllowance(book)).toBe(100000);
  book = setAllowanceDay(book, "p", 1, true);
  book = withEntry(
    book,
    makeEntry("expense", 21000, {
      allowancePeriodId: "p",
      allowanceDayNumber: 1,
    }),
  );
  book = withEntry(
    book,
    makeEntry("expense", 1000, { allowancePeriodId: "p" }),
  );
  expect(availableAllowance(book)).toBe(78000);
});
it("keeps periods independent and uses captured started-day amounts after edits", () => {
  let book = setAllowanceDay(fixture(), "p", 1, true);
  book = savePeriod(
    book,
    {
      id: "p",
      total: 100000,
      dailyAmount: 25000,
      dayCount: 5,
      date: "2026-11-16",
      note: "School",
    },
    true,
  );
  book = setNoClass(book, "p", 2, true);
  book = savePeriod(book, {
    id: "q",
    total: 50000,
    dailyAmount: 10000,
    dayCount: 5,
    date: "2026-11-23",
    note: "Next",
  });
  expect(allowanceAllocation(book, book.periods[0]).available).toBe(55000);
  expect(allowanceAllocation(book, book.periods[1]).available).toBe(50000);
  expect(availableAllowance(book)).toBe(105000);
});
it("does not reserve legacy budgets twice", () => {
  const book = fixture();
  book.periods[0].days[0].accounting = "legacy";
  const started = setAllowanceDay(book, "p", 1, true);
  expect(availableAllowance(started)).toBe(80000);
});
