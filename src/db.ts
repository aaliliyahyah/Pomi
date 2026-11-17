import Dexie, { type Table } from "dexie";
import {
  emptyNotebook,
  makeEntry,
  totals,
  validateNotebook,
  type Notebook,
} from "./model";

export class PomiDatabase extends Dexie {
  notebooks!: Table<Notebook, string>;
  constructor(name = "pomi-notebook") {
    super(name);
    this.version(1).stores({ notebooks: "id" });
  }
}
export const db = new PomiDatabase();
export async function openNotebook(database = db): Promise<Notebook> {
  return database.transaction("rw", database.notebooks, async () => {
    const current = validateNotebook(
      (await database.notebooks.get("main")) ?? emptyNotebook(),
    );
    if (current.initialized) {
      await database.notebooks.put(current);
      return current;
    }
    const fund = {
      id: crypto.randomUUID(),
      name: "My savings",
      goal: null,
      archived: false,
    };
    const book = validateNotebook({
      ...current,
      initialized: true,
      funds: [fund],
      entries: [
        makeEntry("opening_allowance", 0),
        makeEntry("opening_savings", 0, { fundId: fund.id }),
      ],
    });
    await database.notebooks.put(book);
    return book;
  });
}
function recordedDayBalances(book: Notebook) {
  const balances = new Map<
    string,
    { remaining: number; dayNumber: number; startDate?: string }
  >();
  for (const period of book.periods)
    period.days.forEach((day, index) => {
      if (day.amount !== null && !day.noClass)
        balances.set(JSON.stringify([period.id, index + 1]), {
          remaining: day.amount,
          dayNumber: index + 1,
          startDate: period.startDate,
        });
    });
  for (const entry of book.entries) {
    const key =
      entry.kind === "expense" &&
      entry.allowancePeriodId &&
      entry.allowanceDayNumber
        ? JSON.stringify([entry.allowancePeriodId, entry.allowanceDayNumber])
        : entry.periodId &&
            entry.dayNumber &&
            (entry.kind === "expense" || entry.kind === "deposit")
          ? JSON.stringify([entry.periodId, entry.dayNumber])
          : undefined;
    const day = key ? balances.get(key) : undefined;
    if (day) day.remaining -= entry.amount;
  }
  return balances;
}

export class AllowanceWarning extends Error {
  constructor(
    message = "This change will reduce your allowance below zero.",
  ) {
    super(message);
  }
}
// Read and write the same record inside one transaction. Concurrent tabs always
// apply their changes to the latest notebook, rather than overwriting each other.
export async function changeNotebook(
  change: (book: Notebook) => Notebook,
  allowNegative = false,
  database = db,
): Promise<void> {
  await database.transaction("rw", database.notebooks, async () => {
    const current = validateNotebook(
      (await database.notebooks.get("main")) ?? emptyNotebook(),
    );
    const next = validateNotebook(change(structuredClone(current)));
    const before = totals(current).allowance;
    const after = totals(next).allowance;
    if (!allowNegative) {
      const warnings: string[] = [];
      if (after < 0 && after < before)
        warnings.push("Your overall allowance will be below zero.");
      const previousDays = recordedDayBalances(current);
      for (const [key, day] of recordedDayBalances(next)) {
        if (
          day.remaining < 0 &&
          day.remaining < (previousDays.get(key)?.remaining ?? 0)
        )
          warnings.push(
            `Day ${day.dayNumber} in ${day.startDate ?? "this period"} will be over budget.`,
          );
      }
      if (warnings.length)
        throw new AllowanceWarning(warnings.join(" "));
    }
    await database.notebooks.put(next);
  });
}
