import { describe, expect, it } from "vitest";
import {
  emptyNotebook,
  makeEntry,
  deleteFund,
  restoreDeletedFund,
  permanentlyDeleteFund,
  setFundArchived,
  totals,
  exportBackup,
  importBackup,
  validateNotebook,
  savePeriod,
  setAllowanceDay,
} from "./model";
function fixture() {
  const book = emptyNotebook();
  book.initialized = true;
  book.funds = [
    {
      id: "one",
      name: "School",
      goal: 10000,
      archived: false,
      savingMode: "fixed",
      dailyAmount: 1000,
    },
  ];
  book.entries = [
    makeEntry("opening_savings", 0, { fundId: "one" }),
    makeEntry("allowance", 50000),
  ];
  return validateNotebook(book);
}
describe("recoverable fund deletion", () => {
  it("preserves an empty fund and its IDs through deletion, backup, and restore", () => {
    const book = fixture();
    const deleted = deleteFund(book, "one");
    expect(deleted.funds).toEqual([]);
    expect(deleted.deletedFunds[0].fund).toEqual(book.funds[0]);
    expect(totals(deleted).allowance).toBe(totals(book).allowance);
    const restored = restoreDeletedFund(
      importBackup(exportBackup(deleted)),
      "one",
    );
    expect(restored.funds).toEqual(book.funds);
    expect(restored.entries).toEqual(expect.arrayContaining(book.entries));
    expect(restored.deletedFunds).toEqual([]);
    expect(totals(restored)).toEqual(totals(book));
    expect(() => restoreDeletedFund(restored, "one")).toThrow(
      "no longer available",
    );
  });
  it("restores archived deleted funds as active and permanently removes only their snapshot", () => {
    const book = setFundArchived(fixture(), "one", true);
    const deleted = deleteFund(book, "one");
    expect(restoreDeletedFund(deleted, "one").funds[0].archived).toBe(false);
    const purged = permanentlyDeleteFund(deleted, "one");
    expect(purged.deletedFunds).toEqual([]);
    expect(purged.entries).toEqual(deleted.entries);
    expect(() => restoreDeletedFund(purged, "one")).toThrow();
    expect(() => permanentlyDeleteFund(purged, "one")).toThrow();
  });
  it("keeps history and day dependencies protected, including after archiving", () => {
    const book = fixture();
    book.entries.push(
      makeEntry("deposit", 1000, { fundId: "one", source: "extra" }),
    );
    expect(() => deleteFund(book, "one")).toThrow("financial history");
    expect(totals(setFundArchived(book, "one", true))).toEqual(totals(book));
    const linked = setAllowanceDay(
      savePeriod(fixture(), {
        id: "week",
        dailyAmount: 5000,
        total: 50000,
        dayCount: 2,
        date: "2026-11-16",
        note: "",
      }),
      "week",
      1,
      true,
    );
    expect(() => deleteFund(linked, "one")).toThrow("financial history");
  });
  it("keeps the snapshot recoverable when a new fund reuses its name", () => {
    const deleted = deleteFund(fixture(), "one");
    const current = validateNotebook({
      ...deleted,
      funds: [{ ...deleted.deletedFunds[0].fund, id: "another" }],
    });
    expect(() => restoreDeletedFund(current, "one")).toThrow(
      "Rename that fund in Savings",
    );
    expect(current.deletedFunds).toHaveLength(1);
  });
  it("rejects trash with live IDs, nonzero balances, and colliding opening entries", () => {
    const book = fixture(),
      deleted = deleteFund(book, "one");
    expect(() => validateNotebook({ ...deleted, funds: book.funds })).toThrow(
      "duplicate identifier",
    );
    const bad = structuredClone(deleted);
    bad.deletedFunds[0].entries[0].amount = 1;
    expect(() => validateNotebook(bad)).toThrow("empty starting balance");
    expect(() =>
      validateNotebook({
        ...deleted,
        entries: [
          ...deleted.entries,
          makeEntry("opening_allowance", 0, {
            id: deleted.deletedFunds[0].entries[0].id,
          }),
        ],
      }),
    ).toThrow("empty starting balance");
  });
  it("upgrades version 4 without rewriting entries, preferences, or actual/legacy accounting", () => {
    const book = setAllowanceDay(
      savePeriod(fixture(), {
        id: "week",
        total: 50000,
        dailyAmount: 5000,
        dayCount: 2,
        date: "2026-11-16",
        startDate: "2026-11-16",
        schoolDays: [1, 2, 3, 4, 5],
        note: "School",
      }),
      "week",
      1,
      true,
    );
    book.periods[0].days[1].accounting = "legacy";
    const legacy = { ...book, version: 4, deletedFunds: undefined };
    const migrated = validateNotebook(legacy);
    expect(migrated).toEqual({ ...book, version: 5, deletedFunds: [] });
    expect(
      importBackup(
        JSON.stringify({
          app: "pomi",
          version: 4,
          exportedAt: new Date().toISOString(),
          notebook: legacy,
        }),
      ),
    ).toEqual(migrated);
  });
});
