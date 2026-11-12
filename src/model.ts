import { z } from "zod";

export const MAX_AMOUNT = 100_000_000_000;
const cents = z.number().int().min(0).max(MAX_AMOUNT);
const identifier = z.string().min(1).max(100);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date.");
const fundSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(60),
  goal: cents.nullable(),
  archived: z.boolean(),
});
export const kinds = [
  "opening_allowance",
  "allowance",
  "expense",
  "opening_savings",
  "deposit",
  "return",
  "spend",
] as const;
export type Kind = (typeof kinds)[number];
const entrySchema = z
  .object({
    id: identifier,
    kind: z.enum(kinds),
    amount: cents,
    date: dateSchema,
    note: z.string().max(500),
    fundId: identifier.nullable(),
    source: z.enum(["allowance", "extra"]).nullable(),
    createdAt: z.string().datetime(),
  })
  .superRefine((entry, ctx) => {
    const needsFund = [
      "opening_savings",
      "deposit",
      "return",
      "spend",
    ].includes(entry.kind);
    if (needsFund !== (entry.fundId !== null))
      ctx.addIssue({
        code: "custom",
        message: "This entry has an invalid fund.",
      });
    if ((entry.kind === "deposit") !== (entry.source !== null))
      ctx.addIssue({
        code: "custom",
        message: "Only deposits have a funding source.",
      });
    if (entry.amount === 0 && !entry.kind.startsWith("opening_"))
      ctx.addIssue({
        code: "custom",
        message: "Enter an amount greater than zero.",
      });
  });
export const notebookSchema = z.object({
  id: z.literal("main"),
  version: z.literal(1),
  currency: z.literal("PHP"),
  initialized: z.boolean(),
  funds: z.array(fundSchema).max(1000),
  entries: z.array(entrySchema).max(100_000),
});
export type Fund = z.infer<typeof fundSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Notebook = z.infer<typeof notebookSchema>;
export type Totals = {
  allowance: number;
  savings: number;
  funds: Record<string, number>;
};
export const labels: Record<Kind, string> = {
  opening_allowance: "Starting allowance",
  allowance: "Allowance received",
  expense: "Expense",
  opening_savings: "Starting savings",
  deposit: "Savings deposit",
  return: "Returned to allowance",
  spend: "Spent from savings",
};
export function emptyNotebook(): Notebook {
  return {
    id: "main",
    version: 1,
    currency: "PHP",
    initialized: false,
    funds: [],
    entries: [],
  };
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function money(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value / 100);
}
export function parseAmount(raw: string, allowZero = false): number {
  const value = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with no more than two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    !Number.isSafeInteger(amount) ||
    amount > MAX_AMOUNT ||
    amount < (allowZero ? 0 : 1)
  ) {
    throw new Error(
      allowZero
        ? "Enter an amount from ₱0 to ₱1,000,000,000."
        : "Enter an amount above ₱0 and up to ₱1,000,000,000.",
    );
  }
  return amount;
}
export function totals(book: Notebook): Totals {
  const result: Totals = {
    allowance: 0,
    savings: 0,
    funds: Object.fromEntries(book.funds.map((f) => [f.id, 0])),
  };
  for (const entry of book.entries) {
    switch (entry.kind) {
      case "opening_allowance":
      case "allowance":
        result.allowance += entry.amount;
        break;
      case "expense":
        result.allowance -= entry.amount;
        break;
      case "opening_savings":
        result.funds[entry.fundId!] += entry.amount;
        break;
      case "deposit":
        result.funds[entry.fundId!] += entry.amount;
        if (entry.source === "allowance") result.allowance -= entry.amount;
        break;
      case "return":
        result.allowance += entry.amount;
        result.funds[entry.fundId!] -= entry.amount;
        break;
      case "spend":
        result.funds[entry.fundId!] -= entry.amount;
        break;
    }
  }
  result.savings = Object.values(result.funds).reduce((a, b) => a + b, 0);
  return result;
}
export function validateNotebook(input: unknown): Notebook {
  const parsed = notebookSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `Invalid notebook: ${parsed.error.issues[0]?.message ?? "check its format."}`,
    );
  const book = parsed.data;
  const fundIds = new Set(book.funds.map((f) => f.id));
  const names = new Set(book.funds.map((f) => f.name.toLocaleLowerCase()));
  if (fundIds.size !== book.funds.length || names.size !== book.funds.length)
    throw new Error("Every fund needs a unique name and ID.");
  if (new Set(book.entries.map((e) => e.id)).size !== book.entries.length)
    throw new Error("Duplicate entries are not allowed.");
  const openings = new Set<string>();
  for (const entry of book.entries) {
    if (entry.fundId && !fundIds.has(entry.fundId))
      throw new Error("An entry refers to a missing fund.");
    if (entry.kind.startsWith("opening_")) {
      const key = entry.fundId ? `fund:${entry.fundId}` : "allowance";
      if (openings.has(key))
        throw new Error(
          "Only one starting balance is allowed for each account.",
        );
      openings.add(key);
    }
  }
  if (!book.initialized && (book.funds.length || book.entries.length))
    throw new Error("This notebook has not completed setup.");
  const balances = totals(book);
  if (Object.values(balances.funds).some((value) => value < 0))
    throw new Error(
      "This change would leave a savings fund below zero. Adjust its withdrawals first.",
    );
  if (
    ![
      balances.allowance,
      balances.savings,
      ...Object.values(balances.funds),
    ].every(Number.isSafeInteger)
  )
    throw new Error("The balance exceeds the supported range.");
  return book;
}
export function makeEntry(
  kind: Kind,
  amount: number,
  fields: Partial<Entry> = {},
): Entry {
  return {
    id: crypto.randomUUID(),
    kind,
    amount,
    date: localDate(),
    note: "",
    fundId: null,
    source: null,
    createdAt: new Date().toISOString(),
    ...fields,
  };
}
export function withEntry(book: Notebook, entry: Entry): Notebook {
  return validateNotebook({
    ...book,
    entries: [...book.entries.filter((e) => e.id !== entry.id), entry],
  });
}
export function withoutEntry(book: Notebook, id: string): Notebook {
  return validateNotebook({
    ...book,
    entries: book.entries.filter((e) => e.id !== id),
  });
}
const backupSchema = z.object({
  app: z.literal("pomi"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  notebook: notebookSchema,
});
export function exportBackup(book: Notebook): string {
  return JSON.stringify(
    {
      app: "pomi",
      version: 1,
      exportedAt: new Date().toISOString(),
      notebook: validateNotebook(book),
    },
    null,
    2,
  );
}
export function importBackup(raw: string): Notebook {
  if (raw.length > 20_000_000)
    throw new Error("Choose a backup smaller than 20 MB.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON. Choose a Pomi backup.");
  }
  const result = backupSchema.safeParse(value);
  if (!result.success)
    throw new Error("This is not a supported Pomi backup (version 1, PHP).");
  const book = validateNotebook(result.data.notebook);
  if (!book.initialized)
    throw new Error("This backup has not completed setup.");
  return book;
}
