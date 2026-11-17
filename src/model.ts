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
  savingMode: z.enum(["fixed", "flexible"]).optional(),
  dailyAmount: cents
    .refine((v) => v > 0)
    .nullable()
    .optional(),
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
    allowancePeriodId: identifier.optional(),
    allowanceDayNumber: z.number().int().positive().optional(),
    periodId: identifier.optional(),
    dayNumber: z.number().int().positive().optional(),
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
const weekdaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine(
    (days) => new Set(days).size === days.length,
    "Choose each school weekday once.",
  );
export const preferencesSchema = z.object({
  allowanceAmount: cents.nullable().default(null),
  savingsAmount: cents.nullable().default(null),
  schoolDays: weekdaysSchema.default([1, 2, 3, 4, 5]),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default("17:00"),
});
const periodSchema = z.object({
  id: identifier,
  dailyAmount: cents.refine((v) => v > 0),
  startDate: dateSchema.optional(),
  schoolDays: weekdaysSchema.optional(),
  inferredSchedule: z.boolean().optional(),
  days: z
    .array(
      z.object({
        amount: cents.refine((v) => v > 0).nullable(),
        accounting: z.enum(["legacy", "actual"]),
        date: dateSchema.optional(),
        noClass: z.boolean().optional(),
        requiredFunds: z.array(identifier).optional(),
      }),
    )
    .min(1)
    .max(10000),
});
export type AllowancePeriod = z.infer<typeof periodSchema>;
export const notebookSchema = z.object({
  id: z.literal("main"),
  version: z.literal(4),
  currency: z.literal("PHP"),
  initialized: z.boolean(),
  funds: z.array(fundSchema).max(1000),
  entries: z.array(entrySchema).max(100_000),
  periods: z.array(periodSchema).max(10000).default([]),
  preferences: preferencesSchema.default(() => preferencesSchema.parse({})),
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
    version: 4,
    currency: "PHP",
    initialized: false,
    funds: [],
    entries: [],
    periods: [],
    preferences: preferencesSchema.parse({}),
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
  const object =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : null;
  const legacy =
    object?.version === 1 || object?.version === 2 || object?.version === 3;
  let candidate: unknown = input;
  if (legacy) {
    const periods = object?.version === 1 ? [] : object?.periods;
    candidate = {
      ...object,
      version: 4,
      periods: Array.isArray(periods)
        ? periods.map((period) => {
            if (
              !period ||
              typeof period !== "object" ||
              !Array.isArray(period.days)
            )
              return period;
            return {
              ...period,
              days: period.days.map((day: Record<string, unknown>) => {
                if (!day || typeof day !== "object") return day;
                return {
                  ...day,
                  accounting: day.amount === null ? "actual" : "legacy",
                };
              }),
            };
          })
        : periods,
    };
  }
  const parsed = notebookSchema.safeParse(candidate);
  if (!parsed.success)
    throw new Error(
      `Invalid notebook: ${parsed.error.issues[0]?.message ?? "check its format."}`,
    );
  const book = parsed.data;
  // Normalize optional fields for existing notebooks and callers, without touching money records.
  for (const fund of book.funds)
    fund.savingMode ??= fund.dailyAmount ? "fixed" : "flexible";
  for (const period of book.periods) {
    if (!period.startDate || period.days.some((day) => !day.date)) {
      const receipt = book.entries.find(
        (e) => e.periodId === period.id && e.kind === "allowance",
      );
      period.startDate ??= receipt?.date ?? localDate();
      period.schoolDays ??= [1, 2, 3, 4, 5];
      const dates = schoolDates(
        period.startDate,
        period.schoolDays,
        period.days.length,
      );
      period.days.forEach((day, index) => {
        day.date ??= dates[index];
      });
      period.inferredSchedule = true;
    }
    for (const day of period.days) {
      if (day.amount !== null)
        day.requiredFunds ??= book.funds
          .filter(
            (f) => !f.archived && f.savingMode === "fixed" && f.dailyAmount,
          )
          .map((f) => f.id);
    }
  }
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
  validatePeriods(book);
  if (
    !book.initialized &&
    (book.funds.length || book.entries.length || book.periods.length)
  )
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
  if (entry.periodId || book.entries.find((e) => e.id === entry.id)?.periodId)
    throw new Error("Edit this record through its allowance checklist.");
  return validateNotebook({
    ...book,
    entries: [...book.entries.filter((e) => e.id !== entry.id), entry],
  });
}
export function withoutEntry(book: Notebook, id: string): Notebook {
  if (book.entries.find((e) => e.id === id)?.periodId)
    throw new Error("Remove this record through its allowance checklist.");
  return validateNotebook({
    ...book,
    entries: book.entries.filter((e) => e.id !== id),
  });
}
const backupSchema = z.object({
  app: z.literal("pomi"),
  version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  exportedAt: z.string().datetime(),
  notebook: z.unknown(),
});
export function exportBackup(book: Notebook): string {
  return JSON.stringify(
    {
      app: "pomi",
      version: 4,
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
    throw new Error("This is not a supported Pomi backup (versions 1–4, PHP).");
  const book = validateNotebook(result.data.notebook);
  if (!book.initialized)
    throw new Error("This backup has not completed setup.");
  return book;
}

function getPeriod(book: Notebook, id: string): AllowancePeriod {
  const period = book.periods.find((p) => p.id === id);
  if (!period) throw new Error("This allowance period no longer exists.");
  return period;
}
function getDay(period: AllowancePeriod, dayNumber: number) {
  const day = period.days[dayNumber - 1];
  if (!Number.isInteger(dayNumber) || !day)
    throw new Error("Choose a valid allowance day.");
  return day;
}
function dayEntries(book: Notebook, periodId: string, dayNumber: number) {
  return book.entries.filter(
    (e) => e.periodId === periodId && e.dayNumber === dayNumber,
  );
}
export function dailyBalance(
  book: Notebook,
  period: AllowancePeriod,
  dayNumber: number,
) {
  const day = getDay(period, dayNumber);
  const entries = dayEntries(book, period.id, dayNumber);
  const saved = entries
    .filter((entry) => entry.kind === "deposit")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const spent =
    entries
      .filter((entry) => entry.kind === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0) +
    book.entries
      .filter(
        (entry) =>
          entry.kind === "expense" &&
          entry.allowancePeriodId === period.id &&
          entry.allowanceDayNumber === dayNumber,
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
  const allocated = day.noClass ? 0 : (day.amount ?? period.dailyAmount);
  return { allocated, spent, saved, remaining: allocated - spent - saved };
}

export function periodRemaining(
  book: Notebook,
  period: AllowancePeriod,
): number {
  return (
    (book.entries.find(
      (e) => e.periodId === period.id && e.kind === "allowance",
    )?.amount ?? 0) -
    book.entries
      .filter(
        (entry) =>
          entry.periodId === period.id &&
          (entry.kind === "expense" ||
            (entry.kind === "deposit" && entry.source === "allowance")),
      )
      .reduce((sum, entry) => sum + entry.amount, 0) -
    book.entries
      .filter((entry) => entry.allowancePeriodId === period.id)
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
}
function validatePeriods(book: Notebook) {
  const periods = new Map(book.periods.map((period) => [period.id, period]));
  if (periods.size !== book.periods.length)
    throw new Error("Duplicate allowance periods are not allowed.");
  const receipts = new Map<string, number>();
  const groups = new Map<string, Map<number, Entry[]>>();
  function requirePeriod(id: string) {
    const period = periods.get(id);
    if (!period) throw new Error("This allowance period no longer exists.");
    return period;
  }
  for (const entry of book.entries) {
    if (entry.allowancePeriodId) {
      requirePeriod(entry.allowancePeriodId);
      if (entry.kind !== "expense" || entry.periodId)
        throw new Error("Invalid allowance period expense.");
    }
    if (entry.allowanceDayNumber !== undefined) {
      if (
        !entry.allowancePeriodId ||
        entry.kind !== "expense" ||
        entry.periodId
      )
        throw new Error("A daily expense needs an allowance period.");
      const day = getDay(
        requirePeriod(entry.allowancePeriodId),
        entry.allowanceDayNumber,
      );
      if (day.amount === null || day.noClass)
        throw new Error("Start this allowance day before assigning expenses.");
    }
    if (entry.dayNumber !== undefined && !entry.periodId)
      throw new Error("A checklist entry needs an allowance period.");
    if (!entry.periodId) continue;
    const period = requirePeriod(entry.periodId);
    if (entry.dayNumber === undefined) {
      if (entry.kind !== "allowance")
        throw new Error("Invalid allowance receipt.");
      receipts.set(period.id, (receipts.get(period.id) ?? 0) + 1);
    } else {
      const day = getDay(period, entry.dayNumber);
      if (
        day.amount === null ||
        !["expense", "deposit"].includes(entry.kind) ||
        (entry.kind === "deposit" && entry.source !== "allowance")
      )
        throw new Error("Invalid checklist entry.");
      let days = groups.get(period.id);
      if (!days) {
        days = new Map();
        groups.set(period.id, days);
      }
      const entries = days.get(entry.dayNumber) ?? [];
      entries.push(entry);
      days.set(entry.dayNumber, entries);
    }
  }
  for (const period of book.periods) {
    if (receipts.get(period.id) !== 1)
      throw new Error("Each allowance period needs one receipt.");
    period.days.forEach((day, index) => {
      if (day.noClass && day.amount !== null)
        throw new Error(
          "Reverse this day's allowance and savings before marking No Class.",
        );
      if (day.requiredFunds?.some((id) => !book.funds.some((f) => f.id === id)))
        throw new Error("A school day refers to a missing savings fund.");
      const entries = groups.get(period.id)?.get(index + 1) ?? [];
      const deposits = entries.filter((e) => e.kind === "deposit");
      if (
        new Set(deposits.map((e) => e.fundId)).size !== deposits.length ||
        entries.filter((e) => e.kind === "expense").length > 1 ||
        (day.accounting === "legacy"
          ? entries.reduce((sum, e) => sum + e.amount, 0) !== (day.amount ?? 0)
          : entries.some((entry) => entry.kind === "expense") ||
            deposits.reduce((sum, entry) => sum + entry.amount, 0) >
              (day.amount ?? 0))
      )
        throw new Error("Checklist records do not match the day's allowance.");
    });
  }
}
export type PeriodInput = {
  id: string;
  dailyAmount: number;
  total: number;
  dayCount: number;
  date: string;
  note: string;
  startDate?: string;
  schoolDays?: number[];
};
export function savePeriod(
  book: Notebook,
  input: PeriodInput,
  editing = false,
): Notebook {
  const next = structuredClone(book);
  const existing = next.periods.find((p) => p.id === input.id);
  if (editing && !existing)
    throw new Error("This allowance period no longer exists.");
  if (
    !Number.isInteger(input.dayCount) ||
    input.dayCount < 1 ||
    input.dayCount > 10000
  )
    throw new Error("Enter a whole number of days from 1 to 10,000.");
  if (existing?.days.slice(input.dayCount).some((d) => d.amount !== null))
    throw new Error("Uncheck completed days before removing them.");
  const startDate = input.startDate ?? existing?.startDate ?? input.date;
  const schoolDays =
    input.schoolDays ?? existing?.schoolDays ?? next.preferences.schoolDays;
  const dates = schoolDates(startDate, schoolDays, input.dayCount);
  const period: AllowancePeriod = {
    id: input.id,
    dailyAmount: input.dailyAmount,
    startDate,
    schoolDays,
    inferredSchedule: false,
    days: Array.from({ length: input.dayCount }, (_, i) => ({
      ...(existing?.days[i] ?? { amount: null, accounting: "actual" as const }),
      date: dates[i],
    })),
  };
  next.periods = existing
    ? next.periods.map((p) => (p.id === input.id ? period : p))
    : [...next.periods, period];
  const receipt = next.entries.find(
    (e) => e.periodId === input.id && e.kind === "allowance",
  );
  next.entries = [
    ...next.entries.filter((e) => e.id !== receipt?.id),
    makeEntry("allowance", input.total, {
      ...(receipt ? { id: receipt.id, createdAt: receipt.createdAt } : {}),
      periodId: input.id,
      date: input.date,
      note: input.note,
    }),
  ];
  return validateNotebook(next);
}
export function removePeriod(book: Notebook, id: string): Notebook {
  if (book.entries.some((e) => e.allowancePeriodId === id))
    throw new Error(
      "Move or delete this period’s expenses before deleting it.",
    );
  if (getPeriod(book, id).days.some((d) => d.amount !== null))
    throw new Error(
      "Uncheck completed days before deleting this allowance period.",
    );
  return validateNotebook({
    ...book,
    periods: book.periods.filter((p) => p.id !== id),
    entries: book.entries.filter((e) => e.periodId !== id),
  });
}
function rebalanceDay(
  book: Notebook,
  period: AllowancePeriod,
  dayNumber: number,
) {
  if (getDay(period, dayNumber).accounting === "actual") return;
  const entries = dayEntries(book, period.id, dayNumber);
  const expense = entries.find((e) => e.kind === "expense");
  const amount =
    (getDay(period, dayNumber).amount ?? 0) -
    entries
      .filter((e) => e.kind === "deposit")
      .reduce((sum, e) => sum + e.amount, 0);
  if (amount < 0)
    throw new Error(
      "Savings across all funds cannot exceed this day's allowance.",
    );
  book.entries = book.entries.filter((e) => e.id !== expense?.id);
  if (amount > 0)
    book.entries.push(
      makeEntry("expense", amount, {
        ...(expense
          ? { id: expense.id, date: expense.date, createdAt: expense.createdAt }
          : {}),
        date: expense?.date ?? getDay(period, dayNumber).date ?? localDate(),
        periodId: period.id,
        dayNumber,
        note: `Day ${dayNumber} allowance`,
      }),
    );
}
export function setAllowanceDay(
  book: Notebook,
  periodId: string,
  dayNumber: number,
  checked: boolean,
): Notebook {
  const next = structuredClone(book);
  const period = getPeriod(next, periodId);
  const day = getDay(period, dayNumber);
  if (checked && day.noClass)
    throw new Error("Restore this school day before recording allowance.");
  if ((day.amount !== null) === checked) return validateNotebook(next);
  if (
    !checked &&
    dayEntries(next, periodId, dayNumber).some((e) => e.kind === "deposit")
  )
    throw new Error("Uncheck this day's savings in every fund first.");
  if (
    !checked &&
    next.entries.some(
      (entry) =>
        entry.allowancePeriodId === periodId &&
        entry.allowanceDayNumber === dayNumber,
    )
  )
    throw new Error(
      "Delete or reassign this day's expenses before unchecking its allowance.",
    );
  day.amount = checked ? period.dailyAmount : null;
  day.requiredFunds = checked
    ? next.funds
        .filter(
          (f) => !f.archived && f.savingMode !== "flexible" && f.dailyAmount,
        )
        .map((f) => f.id)
    : undefined;
  rebalanceDay(next, period, dayNumber);
  return validateNotebook(next);
}
export function setSavingsDay(
  book: Notebook,
  periodId: string,
  dayNumber: number,
  fundId: string,
  checked: boolean,
): Notebook {
  const next = structuredClone(book);
  const period = getPeriod(next, periodId);
  const day = getDay(period, dayNumber);
  const fund = next.funds.find((f) => f.id === fundId);
  if (!fund) throw new Error("This fund no longer exists.");
  const existing = dayEntries(next, periodId, dayNumber).find(
    (e) => e.kind === "deposit" && e.fundId === fundId,
  );
  if (!!existing === checked) return next;
  if (checked) {
    if (day.amount === null)
      throw new Error("Check the matching allowance day first.");
    if (fund.archived)
      throw new Error("Restore this fund before adding savings.");
    if (
      !fund.dailyAmount ||
      (fund.savingMode === "flexible" && !day.requiredFunds?.includes(fund.id))
    )
      throw new Error("Set this fund's daily savings amount first.");
    if (
      day.accounting === "actual" &&
      fund.dailyAmount > dailyBalance(next, period, dayNumber).remaining
    )
      throw new Error(
        "Savings cannot exceed this day's remaining allowance. Adjust expenses or savings first.",
      );
    next.entries.push(
      makeEntry("deposit", fund.dailyAmount, {
        fundId,
        date: day.date ?? localDate(),
        source: "allowance",
        periodId,
        dayNumber,
        note: `Day ${dayNumber} saved`,
      }),
    );
  } else next.entries = next.entries.filter((e) => e.id !== existing!.id);
  rebalanceDay(next, period, dayNumber);
  return validateNotebook(next);
}

/** Generate local calendar dates without UTC/DST shifts. */
export function schoolDates(
  start: string,
  weekdays: number[],
  count: number,
): string[] {
  if (!dateSchema.safeParse(start).success)
    throw new Error("Choose a valid school start date.");
  if (!weekdaysSchema.safeParse(weekdays).success)
    throw new Error("Choose at least one school weekday without duplicates.");
  if (!Number.isInteger(count) || count < 1 || count > 10000)
    throw new Error("Enter 1 to 10,000 school days.");
  const cursor = new Date(`${start}T12:00:00`);
  const dates: string[] = [];
  while (dates.length < count) {
    if (weekdays.includes(cursor.getDay())) dates.push(localDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
export function dayStatus(
  book: Notebook,
  period: AllowancePeriod,
  index: number,
) {
  const day = period.days[index];
  if (day.noClass) return "No Class";
  if (day.amount === null) return "Not Recorded";
  const required = day.requiredFunds ?? [];
  return required.length &&
    required.every((id) =>
      book.entries.some(
        (e) =>
          e.periodId === period.id &&
          e.dayNumber === index + 1 &&
          e.kind === "deposit" &&
          e.fundId === id,
      ),
    )
    ? "Savings Completed"
    : "Allowance Recorded";
}
export function setNoClass(
  book: Notebook,
  periodId: string,
  dayNumber: number,
  skipped: boolean,
): Notebook {
  const next = structuredClone(book);
  const day = getDay(getPeriod(next, periodId), dayNumber);
  if (day.amount !== null)
    throw new Error(
      "Reverse this day's savings and allowance first, then mark No Class.",
    );
  day.noClass = skipped;
  return validateNotebook(next);
}
export function canDeleteFund(book: Notebook, fundId: string): boolean {
  return (
    !!book.funds.find((f) => f.id === fundId) &&
    !book.entries.some(
      (e) =>
        e.fundId === fundId &&
        !(e.kind === "opening_savings" && e.amount === 0),
    ) &&
    !book.periods.some((p) =>
      p.days.some((d) => d.requiredFunds?.includes(fundId)),
    )
  );
}
export function deleteFund(book: Notebook, fundId: string): Notebook {
  if (!canDeleteFund(book, fundId))
    throw new Error(
      "This fund has financial history. Archive it to keep your records safe.",
    );
  return validateNotebook({
    ...book,
    funds: book.funds.filter((f) => f.id !== fundId),
    entries: book.entries.filter((e) => e.fundId !== fundId),
  });
}
