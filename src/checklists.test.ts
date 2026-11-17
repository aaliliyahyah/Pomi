import { describe, expect, it } from "vitest";
import {
  emptyNotebook,
  exportBackup,
  importBackup,
  makeEntry,
  periodRemaining,
  removePeriod,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
  totals,
  validateNotebook,
  withEntry,
  withoutEntry,
  type Notebook,
} from "./model";

const settings = {
  id: "week",
  dailyAmount: 20000,
  total: 100000,
  dayCount: 3,
  date: "2026-11-15",
  note: "School week",
};
function start(): Notebook {
  const book = savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "one",
          name: "One",
          goal: null,
          archived: false,
          dailyAmount: 5000,
        },
        {
          id: "two",
          name: "Two",
          goal: null,
          archived: false,
          dailyAmount: 10000,
        },
      ],
    },
    settings,
  );
  book.periods[0].days.forEach((day) => {
    day.accounting = "legacy";
  });
  return book;
}
describe("daily allowance and savings", () => {
  it("deducts once, reallocates savings, reverses checks and retains leftover money", () => {
    let book = start();
    book = setAllowanceDay(book, "week", 1, true);
    expect(totals(book).allowance).toBe(80000);
    expect(setAllowanceDay(book, "week", 1, true)).toEqual(book);
    book = setSavingsDay(book, "week", 1, "one", true);
    expect(totals(book)).toEqual({
      allowance: 80000,
      savings: 5000,
      funds: { one: 5000, two: 0 },
    });
    expect(book.entries.find((e) => e.kind === "expense")?.amount).toBe(15000);
    expect(setSavingsDay(book, "week", 1, "one", true)).toEqual(book);
    expect(() => setAllowanceDay(book, "week", 1, false)).toThrow("savings");
    book = setSavingsDay(book, "week", 1, "one", false);
    expect(totals(book).allowance).toBe(80000);
    book = setAllowanceDay(book, "week", 1, false);
    expect(totals(book).allowance).toBe(100000);
    for (let i = 1; i <= 3; i++) book = setAllowanceDay(book, "week", i, true);
    expect(periodRemaining(book, book.periods[0])).toBe(40000);
    expect(totals(book).allowance).toBe(40000);
  });
  it("requires allowance first and limits the combined savings across funds", () => {
    let book = start();
    expect(() => setSavingsDay(book, "week", 1, "one", true)).toThrow(
      "matching allowance",
    );
    book = setAllowanceDay(book, "week", 1, true);
    book = setSavingsDay(book, "week", 1, "one", true);
    book = setSavingsDay(book, "week", 1, "two", true);
    book.funds[1].dailyAmount = 16000;
    book = setSavingsDay(book, "week", 1, "two", false);
    expect(() => setSavingsDay(book, "week", 1, "two", true)).toThrow(
      "cannot exceed",
    );
    book.funds[1].dailyAmount = 15000;
    book = setSavingsDay(book, "week", 1, "two", true);
    expect(book.entries.filter((e) => e.kind === "expense")).toHaveLength(0);
    expect(totals(book).allowance).toBe(80000);
    expect(totals(book).savings).toBe(20000);
  });
  it("keeps completed amounts and applies changes only to unchecked days", () => {
    let book = setSavingsDay(
      setAllowanceDay(start(), "week", 1, true),
      "week",
      1,
      "one",
      true,
    );
    book = savePeriod(
      book,
      { ...settings, dailyAmount: 25000, dayCount: 4 },
      true,
    );
    book.funds[0].dailyAmount = 10000;
    book = setSavingsDay(
      setAllowanceDay(book, "week", 2, true),
      "week",
      2,
      "one",
      true,
    );
    expect(book.periods[0].days.map((d) => d.amount)).toEqual([
      20000,
      25000,
      null,
      null,
    ]);
    expect(
      book.entries.filter((e) => e.kind === "deposit").map((e) => e.amount),
    ).toEqual([5000, 10000]);
    expect(() => savePeriod(book, { ...settings, dayCount: 1 }, true)).toThrow(
      "Uncheck",
    );
    expect(() => removePeriod(book, "week")).toThrow("Uncheck");
    const receipt = book.entries.find((e) => e.kind === "allowance")!;
    expect(() => withEntry(book, { ...receipt, amount: 1 })).toThrow(
      "checklist",
    );
    expect(() => withoutEntry(book, receipt.id)).toThrow("checklist");
  });
  it("tracks money taken and withdrawals, blocking reversal of savings already spent", () => {
    let book = setSavingsDay(
      setAllowanceDay(start(), "week", 1, true),
      "week",
      1,
      "one",
      true,
    );
    const expense = makeEntry("expense", 1000, { allowancePeriodId: "week" });
    book = withEntry(book, expense);
    expect(periodRemaining(book, book.periods[0])).toBe(79000);
    book = withEntry(book, { ...expense, amount: 2000 });
    expect(totals(book).allowance).toBe(78000);
    book = withEntry(book, makeEntry("spend", 2000, { fundId: "one" }));
    expect(totals(book).savings).toBe(3000);
    expect(() => setSavingsDay(book, "week", 1, "one", false)).toThrow(
      "below zero",
    );
  });
  it("keeps multiple periods independent and rejects invalid or inconsistent checklist records", () => {
    let book = start();
    book = savePeriod(book, {
      ...settings,
      id: "next",
      total: 140000,
      dayCount: 7,
    });
    book = setAllowanceDay(book, "week", 1, true);
    expect(periodRemaining(book, book.periods[1])).toBe(140000);
    expect(totals(book).allowance).toBe(220000);
    expect(() => setAllowanceDay(book, "week", 0, true)).toThrow(
      "valid allowance day",
    );
    expect(() => setAllowanceDay(book, "missing", 1, true)).toThrow(
      "no longer exists",
    );
    expect(() => savePeriod(book, { ...settings, dayCount: 1.5 })).toThrow(
      "whole number",
    );
    const broken = structuredClone(book);
    broken.entries.find((e) => e.kind === "expense")!.amount++;
    expect(() => validateNotebook(broken)).toThrow("do not match");
    book.funds[0].archived = true;
    expect(() => setSavingsDay(book, "week", 1, "one", true)).toThrow(
      "Restore",
    );
    book.funds[0].archived = false;
    book.funds[0].dailyAmount = null;
    expect(() => setSavingsDay(book, "week", 1, "one", true)).toThrow(
      "daily savings amount",
    );
  });
  it("round-trips checklists and migrates version 1 backups without changing balances", () => {
    const book = setSavingsDay(
      setAllowanceDay(start(), "week", 1, true),
      "week",
      1,
      "one",
      true,
    );
    expect(importBackup(exportBackup(book))).toEqual(book);
    const legacy = {
      ...emptyNotebook(),
      version: 1,
      initialized: true,
      entries: [makeEntry("allowance", 30000)],
      periods: undefined,
    };
    const migrated = importBackup(
      JSON.stringify({
        app: "pomi",
        version: 1,
        exportedAt: new Date().toISOString(),
        notebook: legacy,
      }),
    );
    expect(migrated.version).toBe(5);
    expect(migrated.periods).toEqual([]);
    expect(totals(migrated).allowance).toBe(30000);
    expect(migrated.entries).toEqual(legacy.entries);
  });
});
