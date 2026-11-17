import { afterEach, describe, expect, it } from "vitest";
import {
  AllowanceWarning,
  changeNotebook,
  openNotebook,
  PomiDatabase,
} from "./db";
import {
  dailyBalance,
  emptyNotebook,
  exportBackup,
  importBackup,
  makeEntry,
  periodRemaining,
  removePeriod,
  savePeriod,
  setAllowanceDay,
  setNoClass,
  setSavingsDay,
  totals,
  validateNotebook,
  withEntry,
  withoutEntry,
  type Notebook,
} from "./model";
const settings = {
  id: "school",
  dailyAmount: 20000,
  total: 100000,
  dayCount: 3,
  date: "2026-11-15",
  startDate: "2026-11-16",
  schoolDays: [1, 2, 3, 4, 5],
  note: "School",
};
function notebook() {
  return savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "fund",
          name: "Goal",
          goal: null,
          archived: false,
          savingMode: "fixed",
          dailyAmount: 5000,
        },
      ],
    },
    settings,
  );
}
function expense(amount = 2500, day = 1) {
  return makeEntry("expense", amount, {
    allowancePeriodId: "school",
    allowanceDayNumber: day,
    date: "2026-11-16",
    note: "Lunch",
  });
}
const databases: PomiDatabase[] = [];
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe("actual daily spending", () => {
  it("allocates without spending and subtracts actual expenses and savings exactly once", () => {
    let book = setAllowanceDay(notebook(), "school", 1, true);
    expect(totals(book).allowance).toBe(100000);
    expect(
      book.entries.filter((entry) => entry.kind === "expense"),
    ).toHaveLength(0);
    expect(setAllowanceDay(book, "school", 1, true)).toEqual(book);
    book = setSavingsDay(withEntry(book, expense()), "school", 1, "fund", true);
    expect(dailyBalance(book, book.periods[0], 1)).toEqual({
      allocated: 20000,
      spent: 2500,
      saved: 5000,
      remaining: 12500,
    });
    expect(totals(book)).toEqual({
      allowance: 92500,
      savings: 5000,
      funds: { fund: 5000 },
    });
    expect(periodRemaining(book, book.periods[0])).toBe(92500);
    const entry = book.entries.find((entry) => entry.note === "Lunch")!;
    book = withEntry(book, { ...entry, amount: 5000 });
    expect(dailyBalance(book, book.periods[0], 1).remaining).toBe(10000);
    book = withoutEntry(book, entry.id);
    expect(dailyBalance(book, book.periods[0], 1).remaining).toBe(15000);
  });
  it("guards day associations, captured rates, removal and savings limits", () => {
    let book = notebook();
    expect(() => withEntry(book, expense())).toThrow(
      "Start this allowance day",
    );
    book = setAllowanceDay(book, "school", 1, true);
    book = withEntry(book, expense(17000));
    expect(() => setSavingsDay(book, "school", 1, "fund", true)).toThrow(
      "remaining allowance",
    );
    expect(() => setAllowanceDay(book, "school", 1, false)).toThrow("reassign");
    expect(() => setNoClass(book, "school", 1, true)).toThrow("Reverse");
    expect(() => removePeriod(book, "school")).toThrow("expenses");
    expect(() =>
      withEntry(book, { ...expense(), allowancePeriodId: undefined }),
    ).toThrow("needs an allowance period");
    expect(() => withEntry(book, expense(100, 99))).toThrow(
      "valid allowance day",
    );
    book = savePeriod(
      book,
      { ...settings, dailyAmount: 30000, startDate: "2026-11-23" },
      true,
    );
    expect(book.periods[0].days[0].amount).toBe(20000);
    expect(book.entries.find((entry) => entry.note === "Lunch")?.date).toBe(
      "2026-11-16",
    );
    book = setAllowanceDay(book, "school", 2, true);
    const entry = book.entries.find((entry) => entry.note === "Lunch")!;
    book = withEntry(book, { ...entry, allowanceDayNumber: 2 });
    expect(dailyBalance(book, book.periods[0], 1).remaining).toBe(20000);
    expect(dailyBalance(book, book.periods[0], 2).remaining).toBe(13000);
    book = setAllowanceDay(book, "school", 1, false);
    book = setNoClass(book, "school", 1, true);
    expect(dailyBalance(book, book.periods[0], 1).allocated).toBe(0);
  });
  it("migrates versions 1–3 without rewriting history, with actual budgets for unrecorded days", () => {
    const old = notebook();
    old.periods[0].days[0].accounting = "legacy";
    const checked = setSavingsDay(
      setAllowanceDay(old, "school", 1, true),
      "school",
      1,
      "fund",
      true,
    );
    const manual = withEntry(
      checked,
      makeEntry("expense", 2500, { allowancePeriodId: "school" }),
    );
    for (const version of [2, 3]) {
      const raw = {
        ...manual,
        version,
        periods: manual.periods.map((period) => ({
          ...period,
          days: period.days.map(({ accounting: _, ...day }) => day),
        })),
      };
      const migrated = validateNotebook(raw);
      expect(migrated.version).toBe(4);
      expect(migrated.entries).toEqual(manual.entries);
      expect(totals(migrated)).toEqual(totals(manual));
      expect(migrated.periods[0].days.map((day) => day.accounting)).toEqual([
        "legacy",
        "actual",
        "actual",
      ]);
      expect(dailyBalance(migrated, migrated.periods[0], 1).remaining).toBe(0);
      const restarted = setAllowanceDay(
        setSavingsDay(migrated, "school", 1, "fund", false),
        "school",
        1,
        false,
      );
      expect(
        setAllowanceDay(restarted, "school", 1, true).periods[0].days[0]
          .accounting,
      ).toBe("legacy");
      expect(
        importBackup(
          JSON.stringify({
            app: "pomi",
            version,
            exportedAt: new Date().toISOString(),
            notebook: raw,
          }),
        ),
      ).toEqual(migrated);
      expect(importBackup(exportBackup(migrated))).toEqual(migrated);
    }
    const v1 = {
      ...emptyNotebook(),
      version: 1,
      initialized: true,
      entries: [makeEntry("allowance", 5000)],
      periods: undefined,
    };
    expect(
      totals(
        importBackup(
          JSON.stringify({
            app: "pomi",
            version: 1,
            exportedAt: new Date().toISOString(),
            notebook: v1,
          }),
        ),
      ).allowance,
    ).toBe(5000);
    const invalid = structuredClone(manual) as unknown as {
      periods: { days: { accounting?: string }[] }[];
    };
    delete invalid.periods[0].days[0].accounting;
    expect(() => validateNotebook(invalid)).toThrow("Invalid notebook");
  });
  it("warns atomically for worsening daily and global balances and serializes concurrent expenses", async () => {
    const db = new PomiDatabase(`daily-${crypto.randomUUID()}`);
    databases.push(db);
    await changeNotebook(
      () => setAllowanceDay(notebook(), "school", 1, true),
      false,
      db,
    );
    const first = expense(19000);
    await changeNotebook((book) => withEntry(book, first), false, db);
    const extra = expense(2500);
    await expect(
      changeNotebook((book) => withEntry(book, extra), false, db),
    ).rejects.toThrow("over budget");
    expect(
      (await db.notebooks.get("main"))!.entries.some(
        (entry) => entry.id === extra.id,
      ),
    ).toBe(false);
    await changeNotebook((book) => withEntry(book, extra), true, db);
    expect(
      dailyBalance(
        (await db.notebooks.get("main"))!,
        (await db.notebooks.get("main"))!.periods[0],
        1,
      ).remaining,
    ).toBe(-1500);
    await changeNotebook(
      (book) => withEntry(book, { ...extra, amount: 2000 }),
      false,
      db,
    );
    await expect(
      changeNotebook(
        (book) => withEntry(book, { ...extra, amount: 100000 }),
        false,
        db,
      ),
    ).rejects.toThrow(/overall allowance.*over budget/);
    await changeNotebook(
      (book) => withoutEntry(withoutEntry(book, extra.id), first.id),
      false,
      db,
    );
    const results = await Promise.allSettled(
      [expense(15000), expense(15000)].map((entry) =>
        changeNotebook((book) => withEntry(book, entry), false, db),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const stored = (await db.notebooks.get("main"))!;
    db.close();
    await db.open();
    expect(await openNotebook(db)).toEqual(stored);
  });
});
