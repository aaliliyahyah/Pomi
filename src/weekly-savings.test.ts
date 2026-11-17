import { describe, expect, it } from "vitest";
import {
  emptyNotebook,
  makeEntry,
  savePeriod,
  setAllowanceDay,
  setNoClass,
  setSavingsDay,
} from "./model";
import { weeklySavings } from "./weekly-savings";
function schoolWeek() {
  return savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "daily",
          name: "Daily",
          goal: null,
          archived: false,
          savingMode: "fixed",
          dailyAmount: 5000,
        },
      ],
    },
    {
      id: "school",
      dailyAmount: 20000,
      total: 100000,
      dayCount: 5,
      date: "2026-11-16",
      startDate: "2026-11-16",
      schoolDays: [1, 2, 3, 4, 5],
      note: "School week",
    },
  );
}
describe("weekly dashboard savings", () => {
  it("shows partial completion and pesos from daily deposits only", () => {
    let book = setSavingsDay(
      setAllowanceDay(schoolWeek(), "school", 1, true),
      "school",
      1,
      "daily",
      true,
    );
    book.entries.push(
      makeEntry("deposit", 9000, {
        fundId: "daily",
        source: "extra",
        date: "2026-11-16",
      }),
    );
    const result = weeklySavings(book, book.periods[0], "2026-11-18");
    expect(result).toMatchObject({
      completed: 1,
      eligible: 5,
      saved: 5000,
      target: 25000,
      remaining: 20000,
    });
    expect(result.days.map((day) => day.dayNumber)).toEqual([1, 2, 3, 4, 5]);
  });
  it("excludes skipped dates from targets and keeps recorded deposit amounts after rate changes", () => {
    let book = setSavingsDay(
      setAllowanceDay(schoolWeek(), "school", 1, true),
      "school",
      1,
      "daily",
      true,
    );
    book.funds[0].dailyAmount = 10000;
    book = setNoClass(book, "school", 2, true);
    expect(weeklySavings(book, book.periods[0], "2026-11-18")).toMatchObject({
      completed: 1,
      eligible: 4,
      saved: 5000,
      target: 35000,
      remaining: 30000,
    });
    expect(
      weeklySavings(book, book.periods[0], "2026-11-18").days[1].status,
    ).toBe("No Class");
  });
  it("handles completed and exceeded targets without negative remaining amounts", () => {
    let book = schoolWeek();
    for (let day = 1; day <= 5; day++)
      book = setSavingsDay(
        setAllowanceDay(book, "school", day, true),
        "school",
        day,
        "daily",
        true,
      );
    expect(weeklySavings(book, book.periods[0], "2026-11-20")).toMatchObject({
      completed: 5,
      eligible: 5,
      saved: 25000,
      target: 25000,
      remaining: 0,
    });
    // A fixed fund added after recording allowance can receive savings without changing captured requirements.
    book.funds.push({
      id: "extra",
      name: "Later",
      goal: null,
      archived: false,
      savingMode: "fixed",
      dailyAmount: 1000,
    });
    book = setSavingsDay(book, "school", 1, "extra", true);
    expect(weeklySavings(book, book.periods[0], "2026-11-20")).toMatchObject({
      saved: 26000,
      target: 25000,
      remaining: 0,
    });
  });
  it("handles missing periods, other weeks, all skips, and flexible-only funds", () => {
    const book = schoolWeek();
    expect(weeklySavings(book, undefined, "2026-11-18")).toMatchObject({
      days: [],
      saved: 0,
      target: 0,
      eligible: 0,
    });
    expect(weeklySavings(book, book.periods[0], "2026-11-23")).toMatchObject({
      days: [],
      target: 0,
    });
    book.funds[0].savingMode = "flexible";
    expect(weeklySavings(book, book.periods[0], "2026-11-18").target).toBe(0);
    let skipped = schoolWeek();
    for (let day = 1; day <= 5; day++)
      skipped = setNoClass(skipped, "school", day, true);
    expect(
      weeklySavings(skipped, skipped.periods[0], "2026-11-18"),
    ).toMatchObject({ eligible: 0, target: 0, remaining: 0 });
  });
});
