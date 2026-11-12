import { describe, expect, it } from "vitest";
import {
  emptyNotebook,
  exportBackup,
  importBackup,
  localDate,
  makeEntry,
  parseAmount,
  totals,
  validateNotebook,
  withEntry,
  withoutEntry,
  type Notebook,
} from "./model";
const fund = { id: "rain", name: "Rainy day", goal: 10000, archived: false };
function notebook(): Notebook {
  return {
    ...emptyNotebook(),
    initialized: true,
    funds: [fund],
    entries: [
      makeEntry("opening_allowance", 10000),
      makeEntry("opening_savings", 5000, { fundId: fund.id }),
    ],
  };
}
describe("money and calendar input", () => {
  it("parses centavos exactly and rejects unsupported formats", () => {
    expect(parseAmount("0.29")).toBe(29);
    expect(parseAmount("25.1")).toBe(2510);
    expect(parseAmount("0", true)).toBe(0);
    for (const input of [
      "0",
      "-1",
      "1.234",
      "1e3",
      "Infinity",
      "",
      "1000000001",
    ])
      expect(() => parseAmount(input)).toThrow();
  });
  it("uses local dates and rejects impossible calendar dates", () => {
    expect(localDate(new Date(2026, 0, 2, 0, 5))).toBe("2026-01-02");
    expect(() =>
      withEntry(notebook(), makeEntry("expense", 100, { date: "2026-02-30" })),
    ).toThrow();
  });
});
describe("notebook balances", () => {
  it("tracks starting money separately and carries across weeks", () => {
    const book = withEntry(
      notebook(),
      makeEntry("allowance", 2000, { date: "2026-01-05" }),
    );
    expect(totals(book)).toEqual({
      allowance: 12000,
      savings: 5000,
      funds: { rain: 5000 },
    });
    expect(book.entries.filter((e) => e.kind === "allowance")).toHaveLength(1);
  });
  it("uses the chosen deposit source and handles both withdrawal destinations", () => {
    let book = withEntry(
      notebook(),
      makeEntry("deposit", 2000, { fundId: "rain", source: "allowance" }),
    );
    book = withEntry(
      book,
      makeEntry("deposit", 1000, { fundId: "rain", source: "extra" }),
    );
    book = withEntry(book, makeEntry("return", 500, { fundId: "rain" }));
    book = withEntry(book, makeEntry("spend", 1500, { fundId: "rain" }));
    expect(totals(book)).toEqual({
      allowance: 8500,
      savings: 6000,
      funds: { rain: 6000 },
    });
  });
  it("recalculates after editing or deleting without duplicating entries", () => {
    const deposit = makeEntry("deposit", 2000, {
      fundId: "rain",
      source: "allowance",
    });
    let book = withEntry(notebook(), deposit);
    book = withEntry(book, { ...deposit, amount: 3000, source: "extra" });
    expect(totals(book).allowance).toBe(10000);
    expect(totals(book).savings).toBe(8000);
    expect(book.entries.filter((e) => e.id === deposit.id)).toHaveLength(1);
    expect(totals(withoutEntry(book, deposit.id))).toEqual(totals(notebook()));
  });
  it("blocks excessive withdrawals and corrections that overdraw a fund", () => {
    expect(() =>
      withEntry(notebook(), makeEntry("spend", 5001, { fundId: "rain" })),
    ).toThrow("below zero");
    const book = withEntry(
      notebook(),
      makeEntry("return", 5000, { fundId: "rain" }),
    );
    expect(() =>
      withoutEntry(
        book,
        book.entries.find((e) => e.kind === "opening_savings")!.id,
      ),
    ).toThrow("below zero");
  });
  it("includes archived funds and supports multiple independent funds", () => {
    const book = validateNotebook({
      ...notebook(),
      funds: [
        { ...fund, archived: true },
        { ...fund, id: "phone", name: "Phone" },
      ],
    });
    expect(totals(book).savings).toBe(5000);
    expect(totals(book).funds.phone).toBe(0);
  });
});
describe("backup validation", () => {
  it("round-trips all entries and balances", () => {
    const book = notebook();
    expect(importBackup(exportBackup(book))).toEqual(book);
  });
  it("rejects broken JSON, wrong versions, duplicate records and missing funds", () => {
    expect(() => importBackup("{")).toThrow("valid JSON");
    expect(() =>
      importBackup(
        exportBackup(notebook()).replace('"version": 1', '"version": 9'),
      ),
    ).toThrow("supported");
    const book = notebook();
    expect(() =>
      validateNotebook({
        ...book,
        entries: [...book.entries, book.entries[0]],
      }),
    ).toThrow("Duplicate");
    expect(() => validateNotebook({ ...book, funds: [] })).toThrow(
      "missing fund",
    );
    expect(() =>
      validateNotebook({
        ...book,
        funds: [...book.funds, { ...fund, id: "other" }],
      }),
    ).toThrow("unique");
  });
  it("rejects mismatched source and fund relationships", () => {
    expect(() =>
      withEntry(notebook(), makeEntry("expense", 100, { fundId: "rain" })),
    ).toThrow("fund");
    expect(() =>
      withEntry(notebook(), makeEntry("deposit", 100, { fundId: "rain" })),
    ).toThrow("source");
  });
});
