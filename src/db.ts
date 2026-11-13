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
    if (current.initialized) return current;
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
export class AllowanceWarning extends Error {
  constructor() {
    super(
      "This change will reduce your allowance below zero. Record it anyway?",
    );
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
    const current = (await database.notebooks.get("main")) ?? emptyNotebook();
    const next = validateNotebook(change(structuredClone(current)));
    const before = totals(current).allowance;
    const after = totals(next).allowance;
    if (!allowNegative && after < 0 && after < before)
      throw new AllowanceWarning();
    await database.notebooks.put(next);
  });
}
