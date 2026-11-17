import { afterEach, describe, expect, it } from "vitest";
import {
  AllowanceWarning,
  changeNotebook,
  openNotebook,
  PomiDatabase,
} from "./db";
import { emptyNotebook, makeEntry, totals, withEntry } from "./model";
const databases: PomiDatabase[] = [];
const database = () => {
  const db = new PomiDatabase(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
};
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});
describe("persistent notebook operations", () => {
  it("opens a new notebook once across concurrent loads and preserves saved entries", async () => {
    const db = database();
    const [first, second] = await Promise.all([
      openNotebook(db),
      openNotebook(db),
    ]);
    expect(first).toEqual(second);
    expect(first.initialized).toBe(true);
    expect(first.funds.map((fund) => fund.name)).toEqual(["My savings"]);
    expect(first.entries).toHaveLength(2);
    expect(totals(first).allowance).toBe(0);
    expect(totals(first).savings).toBe(0);
    await changeNotebook(
      (book) => withEntry(book, makeEntry("allowance", 500)),
      false,
      db,
    );
    const saved = await db.notebooks.get("main");
    expect(await openNotebook(db)).toEqual(saved);
  });
  it("warns before negative allowance and writes only after acceptance", async () => {
    const db = database();
    await changeNotebook((b) => ({ ...b, initialized: true }), false, db);
    const expense = makeEntry("expense", 500);
    await expect(
      changeNotebook((b) => withEntry(b, expense), false, db),
    ).rejects.toBeInstanceOf(AllowanceWarning);
    expect((await db.notebooks.get("main"))!.entries).toHaveLength(0);
    await changeNotebook((b) => withEntry(b, expense), true, db);
    expect(totals((await db.notebooks.get("main"))!).allowance).toBe(-500);
  });
  it("serializes concurrent writes and persists after reopening", async () => {
    const db = database();
    await changeNotebook((b) => ({ ...b, initialized: true }), false, db);
    await Promise.all(
      Array.from({ length: 12 }, () =>
        changeNotebook(
          (b) => withEntry(b, makeEntry("allowance", 100)),
          false,
          db,
        ),
      ),
    );
    db.close();
    await db.open();
    const book = (await db.notebooks.get("main"))!;
    expect(book.entries).toHaveLength(12);
    expect(totals(book).allowance).toBe(1200);
  });
  it("rolls back invalid changes and restores backups atomically", async () => {
    const db = database();
    const book = {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "one",
          name: "One",
          goal: null,
          archived: false,
          savingMode: "flexible" as const,
        },
      ],
      entries: [makeEntry("opening_savings", 100, { fundId: "one" })],
    };
    await changeNotebook(() => book, false, db);
    await expect(
      changeNotebook(
        (b) => withEntry(b, makeEntry("spend", 101, { fundId: "one" })),
        false,
        db,
      ),
    ).rejects.toThrow();
    expect(await db.notebooks.get("main")).toEqual(book);
    await changeNotebook(
      () => ({ ...book, entries: [makeEntry("allowance", 1200)] }),
      true,
      db,
    );
    expect(totals((await db.notebooks.get("main"))!).allowance).toBe(1200);
  });
});

describe("checklist persistence", () => {
  it("migrates a stored legacy notebook while retaining its entries", async () => {
    const db = database();
    const legacy = {
      ...emptyNotebook(),
      version: 1,
      initialized: true,
      periods: undefined,
      entries: [makeEntry("allowance", 12300)],
    };
    await db.notebooks.put(legacy as unknown as import("./model").Notebook);
    const book = await openNotebook(db);
    expect(book.version).toBe(5);
    expect(book.periods).toEqual([]);
    expect(book.entries).toEqual(legacy.entries);
    expect(await db.notebooks.get("main")).toEqual(book);
  });
  it("warns and rolls back a day that exceeds available allowance until confirmed", async () => {
    const { savePeriod, setAllowanceDay } = await import("./model");
    const db = database();
    await changeNotebook(
      (book) =>
        savePeriod(
          { ...book, initialized: true },
          {
            id: "short",
            total: 10000,
            dailyAmount: 20000,
            dayCount: 1,
            date: "2026-11-15",
            note: "",
          },
        ),
      false,
      db,
    );
    await changeNotebook(
      (book) => {
        book.periods[0].days[0].accounting = "legacy";
        return book;
      },
      false,
      db,
    );
    await expect(
      changeNotebook(
        (book) => setAllowanceDay(book, "short", 1, true),
        false,
        db,
      ),
    ).rejects.toBeInstanceOf(AllowanceWarning);
    expect(
      (await db.notebooks.get("main"))!.periods[0].days[0].amount,
    ).toBeNull();
    await changeNotebook(
      (book) => setAllowanceDay(book, "short", 1, true),
      true,
      db,
    );
    expect(totals((await db.notebooks.get("main"))!).allowance).toBe(-10000);
  });
  it("serializes duplicate checklist checks, saves reloads, and rolls back excessive savings", async () => {
    const { savePeriod, setAllowanceDay, setSavingsDay } =
      await import("./model");
    const db = database();
    const input = {
      id: "week",
      total: 100000,
      dailyAmount: 20000,
      dayCount: 3,
      date: "2026-11-15",
      note: "",
    };
    await changeNotebook(
      (book) =>
        savePeriod(
          {
            ...book,
            initialized: true,
            funds: [
              {
                id: "one",
                name: "One",
                goal: null,
                archived: false,
                dailyAmount: 5000,
              },
            ],
          },
          input,
        ),
      false,
      db,
    );
    await Promise.all(
      [1, 2].map(() =>
        changeNotebook(
          (book) => setAllowanceDay(book, "week", 1, true),
          false,
          db,
        ),
      ),
    );
    await Promise.all(
      [1, 2].map(() =>
        changeNotebook(
          (book) => setSavingsDay(book, "week", 1, "one", true),
          false,
          db,
        ),
      ),
    );
    const saved = (await db.notebooks.get("main"))!;
    expect(totals(saved).allowance).toBe(95000);
    expect(totals(saved).savings).toBe(5000);
    db.close();
    await db.open();
    expect(await openNotebook(db)).toEqual(saved);
    await expect(
      changeNotebook(
        (book) => {
          book.funds[0].dailyAmount = 30000;
          return setSavingsDay(
            setAllowanceDay(book, "week", 2, true),
            "week",
            2,
            "one",
            true,
          );
        },
        false,
        db,
      ),
    ).rejects.toThrow("cannot exceed");
    expect(await db.notebooks.get("main")).toEqual(saved);
  });
});
