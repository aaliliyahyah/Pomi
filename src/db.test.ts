import { afterEach, describe, expect, it } from "vitest";
import { AllowanceWarning, changeNotebook, PomiDatabase } from "./db";
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
      funds: [{ id: "one", name: "One", goal: null, archived: false }],
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
