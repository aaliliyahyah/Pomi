import { describe, expect, it } from "vitest";
import {
  canDeleteFund,
  dayStatus,
  deleteFund,
  emptyNotebook,
  exportBackup,
  importBackup,
  makeEntry,
  savePeriod,
  schoolDates,
  setAllowanceDay,
  setNoClass,
  setSavingsDay,
  totals,
  validateNotebook,
} from "./model";
function scheduled() {
  return savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "fixed",
          name: "Daily",
          dailyAmount: 5000,
          savingMode: "fixed",
          goal: 100000,
          archived: false,
        },
        {
          id: "flex",
          name: "Flexible",
          dailyAmount: null,
          savingMode: "flexible",
          goal: null,
          archived: false,
        },
      ],
    },
    {
      id: "period",
      total: 100000,
      dailyAmount: 20000,
      dayCount: 3,
      date: "2026-11-15",
      startDate: "2026-11-16",
      schoolDays: [1, 3, 5],
      note: "School",
    },
  );
}
describe("school schedules and fund requirements", () => {
  it("generates actual school dates across weekends, year boundaries and leap days", () => {
    expect(schoolDates("2026-11-15", [1, 3, 5], 4)).toEqual([
      "2026-11-16",
      "2026-11-18",
      "2026-11-20",
      "2026-11-23",
    ]);
    expect(schoolDates("2026-12-31", [1, 2, 3, 4, 5], 3)).toEqual([
      "2026-12-31",
      "2027-01-01",
      "2027-01-04",
    ]);
    expect(schoolDates("2028-02-28", [1, 2, 3, 4, 5], 3)).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
    expect(() => schoolDates("2026-11-15", [], 3)).toThrow();
    expect(() => schoolDates("2026-02-30", [1], 1)).toThrow();
  });
  it("skips without changing balances or dates and blocks recorded-day skipping", () => {
    let book = scheduled();
    const before = totals(book);
    book = setNoClass(book, "period", 1, true);
    expect(dayStatus(book, book.periods[0], 0)).toBe("No Class");
    expect(book.periods[0].days).toHaveLength(3);
    expect(book.periods[0].days[0].date).toBe("2026-11-16");
    expect(totals(book)).toEqual(before);
    expect(() => setAllowanceDay(book, "period", 1, true)).toThrow("Restore");
    book = setNoClass(book, "period", 1, false);
    expect(dayStatus(book, book.periods[0], 0)).toBe("Not Recorded");
    book = setAllowanceDay(book, "period", 1, true);
    expect(() => setNoClass(book, "period", 1, true)).toThrow("Reverse");
  });
  it("uses scheduled dates, saves only once, and snapshots applicable fixed funds", () => {
    let book = setAllowanceDay(scheduled(), "period", 1, true);
    expect(dayStatus(book, book.periods[0], 0)).toBe("Allowance Recorded");
    expect(book.periods[0].days[0].requiredFunds).toEqual(["fixed"]);
    book.funds.push({
      id: "new",
      name: "New",
      dailyAmount: 1000,
      savingMode: "fixed",
      goal: null,
      archived: false,
    });
    book = setSavingsDay(book, "period", 1, "fixed", true);
    expect(dayStatus(book, book.periods[0], 0)).toBe("Savings Completed");
    expect(
      book.entries
        .filter((e) => e.dayNumber === 1)
        .every((e) => e.date === "2026-11-16"),
    ).toBe(true);
    expect(totals(book).allowance).toBe(95000);
    expect(totals(book).savings).toBe(5000);
    expect(() => setSavingsDay(book, "period", 1, "flex", true)).toThrow(
      "daily savings",
    );
    book = setSavingsDay(book, "period", 1, "fixed", false);
    expect(dayStatus(book, book.periods[0], 0)).toBe("Allowance Recorded");
  });
  it("preserves outstanding fixed requirements when a fund becomes flexible", () => {
    let book = setAllowanceDay(scheduled(), "period", 1, true);
    book.funds[0].savingMode = "flexible";
    book = setSavingsDay(book, "period", 1, "fixed", true);
    expect(dayStatus(book, book.periods[0], 0)).toBe("Savings Completed");
    book = setAllowanceDay(book, "period", 2, true);
    expect(book.periods[0].days[1].requiredFunds).toEqual([]);
    expect(() => setSavingsDay(book, "period", 2, "fixed", true)).toThrow(
      "daily savings",
    );
    expect(dayStatus(book, book.periods[0], 1)).toBe("Allowance Recorded");
  });
  it("migrates v2 schedules deterministically, preserves money and round-trips v4", () => {
    const historical = scheduled();
    historical.periods[0].days[0].accounting = "legacy";
    const original = setSavingsDay(
      setAllowanceDay(historical, "period", 1, true),
      "period",
      1,
      "fixed",
      true,
    );
    const legacy = {
      ...original,
      version: 2,
      preferences: undefined,
      funds: original.funds.map(({ savingMode: _, ...fund }) => fund),
      periods: original.periods.map((period) => ({
        id: period.id,
        dailyAmount: period.dailyAmount,
        days: period.days.map((day) => ({ amount: day.amount })),
      })),
    };
    const migrated = validateNotebook(legacy);
    expect(migrated.version).toBe(4);
    expect(migrated.periods[0].inferredSchedule).toBe(true);
    expect(migrated.periods[0].days[0].date).toBe("2026-11-16");
    expect(migrated.entries).toEqual(original.entries);
    expect(totals(migrated)).toEqual(totals(original));
    expect(importBackup(exportBackup(migrated))).toEqual(migrated);
    const corrected = savePeriod(
      migrated,
      {
        id: "period",
        total: 100000,
        dailyAmount: 30000,
        dayCount: 3,
        date: "2026-11-15",
        startDate: "2026-11-23",
        schoolDays: [1, 3, 5],
        note: "Corrected",
      },
      true,
    );
    expect(corrected.periods[0].days[0].amount).toBe(20000);
    expect(corrected.entries.filter((e) => e.dayNumber)).toEqual(
      migrated.entries.filter((e) => e.dayNumber),
    );
  });
  it("deletes only unused funds, including zero setup records", () => {
    let book = scheduled();
    book.entries.push(makeEntry("opening_savings", 0, { fundId: "flex" }));
    expect(canDeleteFund(book, "flex")).toBe(true);
    book = deleteFund(book, "flex");
    expect(book.funds.map((f) => f.id)).toEqual(["fixed"]);
    book = setAllowanceDay(book, "period", 1, true);
    expect(canDeleteFund(book, "fixed")).toBe(false);
    expect(() => deleteFund(book, "fixed")).toThrow("Archive");
  });
});
