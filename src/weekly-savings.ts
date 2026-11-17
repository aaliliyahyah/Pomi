import {
  dayStatus,
  localDate,
  type AllowancePeriod,
  type Notebook,
} from "./model";

/** A view of scheduled daily savings, independent of manual deposits and fund goals. */
export function weeklySavings(
  book: Notebook,
  period?: AllowancePeriod,
  today = localDate(),
) {
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const from = localDate(start),
    to = localDate(end);
  const days = (period?.days ?? []).flatMap((day, index) => {
    if (!day.date || day.date < from || day.date > to) return [];
    return [
      { ...day, dayNumber: index + 1, status: dayStatus(book, period!, index) },
    ];
  });
  let saved = 0,
    target = 0;
  for (const day of days) {
    if (day.noClass) continue;
    const deposits = book.entries.filter(
      (e) =>
        e.kind === "deposit" &&
        e.periodId === period!.id &&
        e.dayNumber === day.dayNumber,
    );
    saved += deposits.reduce((sum, entry) => sum + entry.amount, 0);
    const requirements =
      day.requiredFunds ??
      book.funds
        .filter((f) => !f.archived && f.savingMode === "fixed" && f.dailyAmount)
        .map((f) => f.id);
    target += requirements.reduce(
      (sum, id) =>
        sum +
        (deposits.find((e) => e.fundId === id)?.amount ??
          book.funds.find((f) => f.id === id)?.dailyAmount ??
          0),
      0,
    );
  }
  return {
    days,
    saved,
    target,
    remaining: Math.max(0, target - saved),
    eligible: days.filter((day) => !day.noClass).length,
    completed: days.filter((day) => day.status === "Savings Completed").length,
  };
}
