import { Select } from "./Select";
import { Children, useEffect, useId, useRef, useState } from "react";
import { Check, Wallet, Sprout, CalendarOff, RotateCcw } from "lucide-react";
import { commit } from "./actions";
import {
  money,
  dailyBalance,
  setAllowanceDay,
  setNoClass,
  dayStatus,
  setSavingsDay,
  type AllowancePeriod,
  type Fund,
  type Notebook,
} from "./model";

export function periodTitle(book: Notebook, period: AllowancePeriod) {
  const receipt = book.entries.find(
    (e) => e.periodId === period.id && e.kind === "allowance",
  );
  return receipt?.note || `Allowance · ${period.days.length} days`;
}

export function PeriodSelector({
  book,
  periodId,
  select,
  presentation = "default",
}: {
  book: Notebook;
  periodId?: string;
  presentation?: "default" | "header";
  select(id: string): void;
}) {
  const id = useId();
  if (!book.periods.length) return null;
  return (
    <div
      className={`period-selector ${presentation === "header" ? "period-selector-header" : ""}`}
    >
      <label
        className={presentation === "header" ? "visually-hidden" : undefined}
        htmlFor={id}
      >
        Allowance period
      </label>
      <Select
        id={id}
        renderLabel={(_, label) => (
          <>
            {Children.map(label, (part) =>
              typeof part === "string" && part.includes("₱") ? (
                <span className="money">{part}</span>
              ) : (
                part
              ),
            )}
          </>
        )}
        value={periodId}
        onChange={(event) => select(event.target.value)}
      >
        {[...book.periods].reverse().map((period) => {
          const receipt = book.entries.find(
            (e) => e.periodId === period.id && e.kind === "allowance",
          );
          return (
            <option key={period.id} value={period.id}>
              {periodTitle(book, period)}
              {presentation !== "header" && (
                <>
                  {" "}
                  ·{" "}
                  {receipt?.date
                    ? new Date(`${receipt.date}T12:00:00`).toLocaleDateString(
                        "en-PH",
                        { month: "short", day: "numeric", year: "numeric" },
                      )
                    : "No date"}{" "}
                  · {money(receipt?.amount ?? 0)}
                </>
              )}
            </option>
          );
        })}
      </Select>
    </div>
  );
}

function DayCheck({
  book,
  period,
  dayNumber,
  fund,
  confirmAllowance,
  compact = false,
  savingsRow = false,
  tableRow = false,
}: {
  book: Notebook;
  period: AllowancePeriod;
  dayNumber: number;
  fund?: Fund;
  compact?: boolean;
  savingsRow?: boolean;
  tableRow?: boolean;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  const hintId = useId();
  const errorId = useId();
  const lock = useRef(false);
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const day = period.days[dayNumber - 1];
  const deposits = book.entries.filter(
    (e) =>
      e.periodId === period.id &&
      e.dayNumber === dayNumber &&
      e.kind === "deposit",
  );
  const saved = deposits.find((e) => e.fundId === fund?.id);
  const stored = fund ? !!saved : day.amount !== null;
  const checked = pending ?? stored;
  const amount = fund
    ? (saved?.amount ?? fund.dailyAmount)
    : (day.amount ?? period.dailyAmount);
  const remaining =
    day.accounting === "actual"
      ? dailyBalance(book, period, dayNumber).remaining
      : (day.amount ?? period.dailyAmount) -
        deposits.reduce((sum, e) => sum + e.amount, 0);
  const unavailable =
    day.noClass ||
    (!!fund &&
      !stored &&
      (day.amount === null ||
        !fund.dailyAmount ||
        (fund.savingMode === "flexible" &&
          !day.requiredFunds?.includes(fund.id)) ||
        fund.archived ||
        (fund.dailyAmount ?? 0) > remaining));
  const state = day.noClass
    ? "No class — no daily budget"
    : pending !== null
      ? "Saving…"
      : checked
        ? fund
          ? "Saved"
          : "Budget started"
        : !fund
          ? day.accounting === "actual"
            ? "Start this day's budget"
            : "Record this day’s allowance"
          : day.amount === null
            ? ""
            : fund.archived
              ? "Restore fund first"
              : !fund.dailyAmount
                ? "Set daily amount first"
                : fund.dailyAmount > remaining
                  ? remaining < 0
                    ? "Over budget — edit expenses to save"
                    : `Needs ${money(fund.dailyAmount - remaining)} more to save`
                  : "Ready to save";
  useEffect(() => {
    if (pending === stored) setPending(null);
  }, [stored, pending]);
  async function toggle(value: boolean) {
    if (lock.current || pending !== null || unavailable) return;
    lock.current = true;
    setPending(value);
    setError("");
    setAnnouncement("");
    try {
      const saved = await commit(
        (current) =>
          fund
            ? setSavingsDay(current, period.id, dayNumber, fund.id, value)
            : setAllowanceDay(current, period.id, dayNumber, value),
        confirmAllowance,
      );
      if (!saved) setPending(null);
      else
        setAnnouncement(
          `${fund?.name ?? "Allowance"} for day ${dayNumber} ${value ? "checked" : "unchecked"}. Balances updated.`,
        );
    } catch (e) {
      setPending(null);
      setError(
        e instanceof Error ? e.message : "Unable to save this day. Try again.",
      );
    } finally {
      lock.current = false;
    }
  }
  if (day.noClass && tableRow)
    return (
      <>
        <td>—</td>
        <td>
          <span className="savings-check-status is-unavailable">No class</span>
        </td>
      </>
    );
  if (day.noClass && !tableRow)
    return (
      <div className={`day-control ${savingsRow ? "savings-check-row" : ""}`}>
        <div className="day-check">
          <span className="day-control-name">
            {fund && !savingsRow && <span>{fund.name}</span>}
            <strong>—</strong>
          </span>
          {savingsRow && (
            <span className="savings-check-status is-unavailable">
              No class
            </span>
          )}
        </div>
      </div>
    );
  const control = (
    <div
      className={`day-control ${savingsRow ? "savings-check-row" : ""} ${fund ? "savings-control" : "allowance-control"} ${checked ? "is-checked" : ""}`}
    >
      <label className="day-check">
        <input
          type="checkbox"
          checked={checked}
          disabled={unavailable}
          aria-disabled={pending !== null || undefined}
          aria-label={`Day ${dayNumber} ${fund?.name ?? "allowance"} ${day.noClass ? "no budget" : amount ? money(amount) : "Set amount"}`}
          aria-describedby={
            [state ? hintId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={!!error || undefined}
          onChange={(event) => void toggle(event.target.checked)}
        />
        {!compact &&
          !savingsRow &&
          !tableRow &&
          (fund ? (
            <Sprout aria-hidden="true" size={18} />
          ) : (
            <Wallet aria-hidden="true" size={18} />
          ))}
        <span className="day-control-name">
          <span
            className={
              savingsRow || tableRow || (compact && !fund)
                ? "visually-hidden"
                : undefined
            }
          >
            {fund?.name ?? "Allowance"}
          </span>
          <strong>
            {day.noClass ? "—" : amount ? money(amount) : "Set amount"}
          </strong>
        </span>
        {savingsRow && !tableRow && (
          <span
            className={`savings-check-status ${day.noClass || (unavailable && !checked) ? "is-unavailable" : checked ? "is-saved" : "is-pending"}`}
          >
            {pending !== null
              ? "Saving…"
              : day.noClass
                ? "No class"
                : checked
                  ? "Saved"
                  : unavailable
                    ? "Unavailable"
                    : "Pending"}
          </span>
        )}
        {checked && !compact && !savingsRow && !tableRow && (
          <Check size={16} aria-hidden="true" className="checked-mark" />
        )}
      </label>
      {state && (
        <p
          id={hintId}
          className={
            tableRow ||
            (savingsRow && pending === null && (!unavailable || day.noClass)) ||
            (compact &&
              pending === null &&
              (!fund || !unavailable || day.noClass))
              ? "visually-hidden"
              : "day-state"
          }
        >
          {state}
        </p>
      )}
      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
    </div>
  );
  if (tableRow)
    return (
      <>
        <td>{control}</td>
        <td>
          <span
            className={`savings-check-status ${day.noClass || (unavailable && !checked) ? "is-unavailable" : checked ? "is-saved" : "is-pending"}`}
          >
            {pending !== null
              ? "Saving…"
              : day.noClass
                ? "No class"
                : checked
                  ? "Saved"
                  : unavailable
                    ? "Unavailable"
                    : "Pending"}
          </span>
        </td>
      </>
    );
  return control;
}

export function DailyChecklist({
  book,
  period,
  fund,
  confirmAllowance,
}: {
  book: Notebook;
  period: AllowancePeriod;
  fund: Fund;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  return (
    <table
      className="savings-days-table"
      aria-label={`${fund.name} savings days`}
    >
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Savings</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {period.days.map((day, index) => (
          <tr
            key={index}
            className={
              day.noClass
                ? "is-no-class"
                : book.entries.some(
                      (entry) =>
                        entry.kind === "deposit" &&
                        entry.periodId === period.id &&
                        entry.dayNumber === index + 1 &&
                        entry.fundId === fund.id,
                    )
                  ? "is-saved"
                  : ""
            }
          >
            <th scope="row">
              <time dateTime={day.date}>{schoolDate(day.date)}</time>
              <small>Day {index + 1}</small>
            </th>
            <DayCheck
              tableRow
              book={book}
              period={period}
              dayNumber={index + 1}
              fund={fund}
              confirmAllowance={confirmAllowance}
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DailyCheckIn({
  book,
  period,
  confirmAllowance,
}: {
  book: Notebook;
  period: AllowancePeriod;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  return (
    <div className="allowance-days">
      <table
        className="savings-days-table allowance-days-table"
        aria-label="Allowance days"
      >
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Allowance</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {period.days.map((day, index) => {
            const started = day.amount !== null;
            const complete =
              dayStatus(book, period, index) === "Savings Completed" ||
              (started && !day.requiredFunds?.length);
            return (
              <tr
                className={`checkin-day ${day.noClass ? "is-skipped" : complete ? "is-completed" : ""}`}
                key={index}
                id={`checkin-day-${period.id}-${index + 1}`}
                tabIndex={-1}
                aria-label={`Day ${index + 1}`}
              >
                <th scope="row" className="allowance-date-cell">
                  <time dateTime={day.date}>{schoolDate(day.date)}</time>
                  <small>
                    Day {index + 1}
                    {day.noClass ? " · No class" : ""}
                  </small>
                </th>
                <td className="allowance-cell">
                  <DayCheck
                    book={book}
                    period={period}
                    dayNumber={index + 1}
                    confirmAllowance={confirmAllowance}
                    compact
                  />
                </td>
                <td className="day-actions">
                  <SkipDay
                    book={book}
                    period={period}
                    dayNumber={index + 1}
                    confirmAllowance={confirmAllowance}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function schoolDate(date?: string) {
  return date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not set";
}
function SkipDay({
  book: _book,
  period,
  dayNumber,
  confirmAllowance,
}: {
  book: Notebook;
  period: AllowancePeriod;
  dayNumber: number;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const day = period.days[dayNumber - 1];
  return (
    <div className="skip-day">
      <button
        className="button secondary"
        disabled={day.amount !== null}
        aria-disabled={busy || undefined}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            await commit(
              (current) =>
                setNoClass(current, period.id, dayNumber, !day.noClass),
              confirmAllowance,
            );
            setNotice(
              day.noClass
                ? "School day restored."
                : "No class saved. This day’s allowance is excluded from available allowance.",
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to save. Try again.",
            );
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {day.noClass ? (
          <RotateCcw size={16} aria-hidden="true" />
        ) : (
          <CalendarOff size={16} aria-hidden="true" />
        )}
        {busy
          ? "Saving…"
          : day.noClass
            ? "Restore school day"
            : "Mark no class"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <span className="visually-hidden" role="status">
        {notice}
      </span>
    </div>
  );
}
