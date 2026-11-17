import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  Check,
  CalendarDays,
  CalendarCheck,
  ChevronRight,
  ChevronDown,
  Download,
  History,
  House,
  Leaf,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sprout,
  Ellipsis,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { changeNotebook, db, openNotebook } from "./db";
import { commit } from "./actions";
import {
  ActionMenu,
  SchoolWeekdays,
  SavingsReminder,
  CheckInLink,
  WeeklySavings,
} from "./dashboard-ui";
import { Select } from "./Select";
import { Sticker } from "./Stickers";
import {
  DailyChecklist,
  DailyCheckIn,
  PeriodSelector,
  periodTitle,
} from "./check-in";
import {
  savePeriod,
  dailyBalance,
  dayStatus,
  schoolDates,
  deleteFund,
  canDeleteFund,
  preferencesSchema,
  removePeriod,
  setAllowanceDay,
  setSavingsDay,
  type AllowancePeriod,
  exportBackup,
  importBackup,
  labels,
  localDate,
  makeEntry,
  money,
  parseAmount,
  totals,
  validateNotebook,
  withEntry,
  withoutEntry,
  type Entry,
  type Fund,
  type Kind,
  type Notebook,
} from "./model";

type Page =
  "home" | "allowance" | "expenses" | "savings" | "history" | "settings";
type ModalState =
  | {
      type: "entry";
      kind: Kind;
      entry?: Entry;
      fundId?: string;
      allowancePeriodId?: string;
      allowanceDayNumber?: number;
    }
  | { type: "fund"; fund?: Fund }
  | { type: "period"; periodId?: string }
  | null;
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type PendingAllowanceConfirmation = {
  message: string;
  resolve(confirmed: boolean): void;
};
const pages: { id: Page; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "allowance", label: "Allowance", icon: Wallet },
  { id: "savings", label: "Savings", icon: Sprout },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];
const pageFromHash = (): Page =>
  pages.some((p) => p.id === location.hash.slice(1))
    ? (location.hash.slice(1) as Page)
    : "home";
const text = (data: FormData, key: string) => String(data.get(key) ?? "");
const amountText = (amount: number) => (amount / 100).toFixed(2);
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message === "Every fund needs a unique name and ID."
      ? "That fund name is already in use. Enter a different name."
      : error.message
    : "Unable to save. Try again.";
const displayDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-title">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Form({
  children,
  submit,
  label = "Save entry",
  onChange,
}: {
  children: ReactNode;
  submit(data: FormData): Promise<void>;
  label?: string;
  onChange?(data: FormData): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await submit(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={handle}
      onChange={
        onChange
          ? (event) => onChange(new FormData(event.currentTarget))
          : undefined
      }
      aria-busy={busy}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary form-submit"
        type="submit"
        disabled={busy}
      >
        {busy ? "Saving…" : label}
        <Check size={17} />
      </button>
    </form>
  );
}
function AmountField({
  label = "Amount",
  value,
  allowZero = false,
  name = "amount",
}: {
  label?: string;
  value?: string;
  allowZero?: boolean;
  name?: string;
}) {
  const [validation, setValidation] = useState("");
  const errorId = useId();
  const inputId = useId();
  return (
    <div className="amount-field">
      <label htmlFor={inputId}>{label}</label>
      <span className="money-input">
        <span aria-hidden="true">₱</span>
        <input
          id={inputId}
          name={name}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={allowZero ? "0" : "0.01"}
          max="1000000000"
          required
          aria-invalid={validation ? true : undefined}
          aria-describedby={validation ? errorId : undefined}
          onInvalid={(event) =>
            setValidation(event.currentTarget.validationMessage)
          }
          defaultValue={value}
          placeholder="0.00"
          onInput={(event) => {
            const input = event.currentTarget;
            setValidation("");
            input.setCustomValidity("");
            if (input.value)
              try {
                parseAmount(input.value, allowZero);
              } catch (error) {
                input.setCustomValidity(errorMessage(error));
              }
          }}
        />
      </span>
      {validation && (
        <span className="field-error" id={errorId}>
          {validation}
        </span>
      )}
    </div>
  );
}
function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Sticker kind="heart" />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function SavingsChecklists({
  book,
  fund,
  edit,
  period,
  confirmAllowance,
}: {
  book: Notebook;
  fund: Fund;
  period?: AllowancePeriod;
  edit(): void;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  return (
    <div className="savings-checklists">
      {!fund.dailyAmount && fund.savingMode === "fixed" && (
        <button className="button quiet" onClick={edit}>
          Set daily savings amount
        </button>
      )}
      {!book.periods.length && (
        <p className="field-help">
          <a href="#allowance">Add an allowance period</a> to create your
          savings days.
        </p>
      )}
      {period && (
        <DailyChecklist
          book={book}
          period={period}
          fund={fund}
          confirmAllowance={confirmAllowance}
        />
      )}
    </div>
  );
}

function GoalProgress({
  balance,
  goal,
  name,
}: {
  balance: number;
  goal: number;
  name: string;
}) {
  const percent = Math.min(
    100,
    Math.max(0, Math.round((balance / goal) * 100)),
  );
  return (
    <div className="fund-goal-progress">
      <div className="goal-caption">
        <span>
          {money(balance)} of {money(goal)}
        </span>
        <span>{percent}%</span>
      </div>
      <progress
        className="goal-meter"
        aria-label={`${name} goal progress`}
        max={goal}
        value={Math.max(0, Math.min(balance, goal))}
      />
    </div>
  );
}

function PeriodEditor({
  book,
  periodId,
  close,
  saved,
  selected,
  confirmAllowance,
}: {
  book: Notebook;
  periodId?: string;
  close(): void;
  saved(message: string): void;
  selected(id: string): void;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  const [newId] = useState(() => crypto.randomUUID());
  const period = book.periods.find((p) => p.id === periodId);
  const receipt = periodId
    ? book.entries.find(
        (e) => e.periodId === periodId && e.kind === "allowance",
      )
    : undefined;
  const [preview, setPreview] = useState<{
    allocated: number;
    leftover: number;
  } | null>(() => {
    if (!period || !receipt) return null;
    const allocated = period.days.reduce(
      (sum, day) => sum + (day.amount ?? period.dailyAmount),
      0,
    );
    return { allocated, leftover: receipt.amount - allocated };
  });
  function updatePreview(data: FormData) {
    try {
      const total = parseAmount(text(data, "total"));
      const daily = parseAmount(text(data, "dailyAmount"));
      const count = Number(text(data, "dayCount"));
      if (!Number.isInteger(count) || count < 1 || count > 10000)
        return setPreview(null);
      const completed =
        period?.days.slice(0, count).filter((day) => day.amount !== null) ?? [];
      const allocated =
        completed.reduce((sum, day) => sum + day.amount!, 0) +
        (count - completed.length) * daily;
      setPreview({ allocated, leftover: total - allocated });
    } catch {
      setPreview(null);
    }
  }
  return (
    <Modal
      title={periodId ? "Edit allowance period" : "Add allowance"}
      close={close}
    >
      <Form
        label="Save allowance"
        onChange={updatePreview}
        submit={async (data) => {
          const input = {
            id: periodId ?? newId,
            dailyAmount: parseAmount(text(data, "dailyAmount")),
            total: parseAmount(text(data, "total")),
            dayCount: Number(text(data, "dayCount")),
            date: text(data, "date"),
            note: text(data, "note").trim(),
            startDate: text(data, "startDate"),
            schoolDays: data.getAll("schoolDays").map(Number),
          };
          if (
            await commit(
              (current) => savePeriod(current, input, !!periodId),
              confirmAllowance,
            )
          ) {
            selected(input.id);
            saved("Allowance period saved.");
            close();
          }
        }}
      >
        <p className="form-intro">
          Enter what you received and how you plan to use it.
        </p>
        <AmountField
          label="Total allowance given"
          name="total"
          value={receipt ? amountText(receipt.amount) : undefined}
        />
        <AmountField
          label="Daily allowance amount"
          name="dailyAmount"
          value={
            period
              ? amountText(period.dailyAmount)
              : book.preferences.allowanceAmount
                ? amountText(book.preferences.allowanceAmount)
                : undefined
          }
        />
        <label>
          Number of days
          <input
            name="dayCount"
            type="number"
            min="1"
            max="10000"
            step="1"
            required
            defaultValue={period?.days.length}
          />
        </label>
        <div className="allowance-preview" role="status">
          {preview ? (
            <>
              <span>
                Total for planned days{" "}
                <strong>{money(preview.allocated)}</strong>
              </span>
              <span>
                {preview.leftover < 0
                  ? "More than the total received"
                  : "Left after planned days"}
                <strong>{money(Math.abs(preview.leftover))}</strong>
              </span>
              {preview.leftover < 0 && (
                <p>
                  These days need more than you received. Adjust the amounts, or
                  continue if you intend to use existing allowance.
                </p>
              )}
            </>
          ) : (
            <p>Enter all three amounts to preview your plan.</p>
          )}
        </div>
        <label>
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={receipt?.date ?? localDate()}
          />
        </label>
        <label>
          School start date
          <input
            type="date"
            name="startDate"
            required
            defaultValue={period?.startDate ?? localDate()}
          />
        </label>
        {period?.inferredSchedule && (
          <p className="field-help">
            Dates were inferred from the receipt using Monday–Friday. Confirm or
            correct the schedule here. Existing transaction dates stay
            unchanged.
          </p>
        )}
        <SchoolWeekdays
          value={period?.schoolDays ?? book.preferences.schoolDays}
        />
        <SchedulePreview period={period} />
        <label>
          Note <span className="optional">optional</span>
          <textarea
            name="note"
            maxLength={500}
            defaultValue={receipt?.note}
            placeholder="e.g. School allowance"
          />
        </label>
        <p className="field-help">
          The total can differ from the daily amount × days. Completed days keep
          their original amount. Uncheck a completed day before removing it.
        </p>
      </Form>
    </Modal>
  );
}
function EntryEditor({
  state,
  book,
  close,
  saved,
  confirmAllowance,
}: {
  state: Extract<ModalState, { type: "entry" }>;
  book: Notebook;
  close(): void;
  saved(message: string): void;
  confirmAllowance(message: string): Promise<boolean>;
}) {
  const existing = state.entry;
  const kind = existing?.kind ?? state.kind;
  const needsFund = ["deposit", "return", "spend", "opening_savings"].includes(
    kind,
  );
  const [expensePeriod, setExpensePeriod] = useState(
    existing
      ? (existing.allowancePeriodId ?? "")
      : (state.allowancePeriodId ?? book.periods.at(-1)?.id ?? ""),
  );
  const [expenseDay, setExpenseDay] = useState(
    String(existing?.allowanceDayNumber ?? state.allowanceDayNumber ?? ""),
  );
  const expenseAllowance = book.periods.find(
    (period) => period.id === expensePeriod,
  );
  const initialDate =
    existing?.date ??
    (state.allowanceDayNumber
      ? expenseAllowance?.days[state.allowanceDayNumber - 1]?.date
      : undefined) ??
    localDate();
  const [source, setSource] = useState(existing?.source ?? "allowance");
  const [withdrawal, setWithdrawal] = useState<Kind>(
    kind === "spend" ? "spend" : "return",
  );
  const isWithdrawal = kind === "return" || kind === "spend";
  const [selectedFund, setSelectedFund] = useState(
    existing?.fundId ??
      state.fundId ??
      book.funds.find((f) => !f.archived)?.id ??
      "",
  );
  const fundOptions = book.funds.filter(
    (f) => !f.archived || isWithdrawal || existing?.fundId === f.id,
  );
  const balance = totals(book).funds[selectedFund] ?? 0;
  return (
    <Modal
      title={
        existing
          ? "Edit entry"
          : isWithdrawal
            ? "Withdraw savings"
            : labels[kind]
      }
      close={close}
    >
      <Form
        submit={async (data) => {
          const entry = makeEntry(
            isWithdrawal ? withdrawal : kind,
            parseAmount(text(data, "amount"), kind.startsWith("opening_")),
            {
              ...(existing
                ? { id: existing.id, createdAt: existing.createdAt }
                : {}),
              date: text(data, "date"),
              note: text(data, "note").trim(),
              fundId: needsFund ? selectedFund : null,
              source: kind === "deposit" ? source : null,
              ...(kind === "expense" && expensePeriod
                ? {
                    allowancePeriodId: expensePeriod,
                    ...(expenseDay
                      ? { allowanceDayNumber: Number(expenseDay) }
                      : {}),
                  }
                : {}),
            },
          );
          if (
            await commit((current) => {
              if (
                existing &&
                !current.entries.some((e) => e.id === existing.id)
              )
                throw new Error(
                  "This entry was removed in another tab. Close this dialog and try again.",
                );
              const fund = current.funds.find((f) => f.id === selectedFund);
              if (kind === "deposit" && !existing && fund?.archived)
                throw new Error(
                  "This fund is archived. Restore it before adding savings.",
                );
              return withEntry(current, entry);
            }, confirmAllowance)
          ) {
            saved(existing ? "Entry updated." : "A little note, saved.");
            close();
          }
        }}
      >
        {needsFund && (
          <div className="select-field">
            <label htmlFor="select-1">Savings fund</label>
            <Select
              id="select-1"
              aria-describedby="select-1-hint"
              name="fundId"
              value={selectedFund}
              onChange={(event) => setSelectedFund(event.target.value)}
              required
              disabled={kind === "opening_savings"}
            >
              <option value="" disabled>
                Choose a fund
              </option>
              {fundOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.archived ? " (archived)" : ""}
                </option>
              ))}
            </Select>
            <span className="field-help" id="select-1-hint">
              Current balance: {money(balance)}
            </span>
          </div>
        )}
        <AmountField
          value={existing ? amountText(existing.amount) : undefined}
          allowZero={kind.startsWith("opening_")}
        />
        {kind === "expense" && book.periods.length > 0 && (
          <div className="select-field">
            <label htmlFor="select-2">Allowance period</label>
            <Select
              id="select-2"
              aria-describedby="select-2-hint"
              value={expensePeriod}
              onChange={(event) => {
                setExpensePeriod(event.target.value);
                setExpenseDay("");
              }}
            >
              <option value="">General allowance</option>
              {book.periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {periodTitle(book, period)}
                </option>
              ))}
            </Select>
            <span className="field-help" id="select-2-hint">
              Choose a period and, optionally, a started day for this expense.
            </span>
          </div>
        )}
        {kind === "expense" && expenseAllowance && (
          <div className="select-field">
            <label htmlFor="expense-day">Allowance day</label>
            <Select
              id="expense-day"
              value={expenseDay}
              onChange={(event) => setExpenseDay(event.target.value)}
              aria-describedby="expense-day-hint"
            >
              <option value="">Not assigned to a day</option>
              {expenseAllowance.days.map((day, index) => (
                <option
                  key={index}
                  value={String(index + 1)}
                  disabled={day.amount === null || day.noClass}
                >
                  {day.date ? displayDate(day.date) : "No date"} · Day{" "}
                  {index + 1}
                  {day.noClass
                    ? " · No Class"
                    : day.amount === null
                      ? " · Not started"
                      : ""}
                </option>
              ))}
            </Select>
            <span id="expense-day-hint" className="field-help">
              Start a day in Allowance before assigning expenses. Unassigned
              expenses affect the overall balance.
            </span>
          </div>
        )}
        {kind === "deposit" && (
          <div className="select-field">
            <label htmlFor="select-3">Where is this money from?</label>
            <Select
              id="select-3"
              aria-describedby="select-3-hint"
              value={source}
              onChange={(event) =>
                setSource(event.target.value as "allowance" | "extra")
              }
            >
              <option value="allowance">My allowance</option>
              <option value="extra">Extra money</option>
            </Select>
            <span className="field-help" id="select-3-hint">
              {source === "allowance"
                ? "This also reduces your available allowance."
                : "Your allowance balance stays the same."}
            </span>
          </div>
        )}
        {isWithdrawal && (
          <div className="select-field">
            <label htmlFor="select-4">Where is this money going?</label>
            <Select
              id="select-4"
              aria-describedby="select-4-hint"
              value={withdrawal}
              onChange={(event) => setWithdrawal(event.target.value as Kind)}
            >
              <option value="return">Back to my allowance</option>
              <option value="spend">Spent directly from savings</option>
            </Select>
            <span className="field-help" id="select-4-hint">
              {withdrawal === "return"
                ? "This increases your available allowance."
                : "This records spending without changing your allowance."}
            </span>
          </div>
        )}
        <label>
          Date
          <input name="date" type="date" required defaultValue={initialDate} />
        </label>
        <label>
          Note <span className="optional">optional</span>
          <textarea
            name="note"
            maxLength={500}
            rows={2}
            placeholder="A little context for future you…"
            defaultValue={existing?.note}
          />
        </label>
      </Form>
    </Modal>
  );
}
function FundEditor({
  fund,
  book,
  close,
  saved,
}: {
  fund?: Fund;
  book: Notebook;
  close(): void;
  saved(message: string): void;
}) {
  const [mode, setMode] = useState<"fixed" | "flexible">(
    fund?.savingMode ?? "fixed",
  );
  return (
    <Modal
      title={fund ? "Edit savings fund" : "Create savings fund"}
      close={close}
    >
      <Form
        label={fund ? "Save fund" : "Create fund"}
        submit={async (data) => {
          const updated: Fund = {
            id: fund?.id ?? crypto.randomUUID(),
            name: text(data, "name").trim(),
            goal: text(data, "goal").trim()
              ? parseAmount(text(data, "goal"))
              : null,
            archived: fund?.archived ?? false,
            dailyAmount:
              mode === "fixed"
                ? parseAmount(text(data, "dailyAmount"))
                : (fund?.dailyAmount ?? null),
            savingMode: mode,
          };
          const initial = fund
            ? null
            : makeEntry(
                "opening_savings",
                parseAmount(text(data, "amount"), true),
                { fundId: updated.id },
              );
          await changeNotebook((current) => {
            if (fund && !current.funds.some((f) => f.id === fund.id))
              throw new Error(
                "This fund no longer exists. Close this dialog and try again.",
              );
            return {
              ...current,
              funds: fund
                ? current.funds.map((f) =>
                    f.id === fund.id ? { ...updated, archived: f.archived } : f,
                  )
                : [...current.funds, updated],
              entries: initial
                ? [...current.entries, initial]
                : current.entries,
            };
          });
          saved(fund ? "Fund updated." : "Savings fund created.");
          close();
        }}
      >
        <label>
          Fund name
          <input
            name="name"
            required
            maxLength={60}
            placeholder="e.g. Rainy day fund"
            defaultValue={fund?.name}
          />
        </label>
        <div className="select-field">
          <label htmlFor="select-5">Saving frequency</label>
          <Select
            id="select-5"
            value={mode}
            onChange={(e) => setMode(e.target.value as "fixed" | "flexible")}
          >
            <option value="fixed">Fixed daily</option>
            <option value="flexible">Flexible — save any amount</option>
          </Select>
        </div>
        {mode === "fixed" && (
          <AmountField
            label="Daily savings amount"
            name="dailyAmount"
            value={
              fund?.dailyAmount
                ? amountText(fund.dailyAmount)
                : book.preferences.savingsAmount
                  ? amountText(book.preferences.savingsAmount)
                  : undefined
            }
          />
        )}
        <p className="field-help">
          {mode === "fixed"
            ? "One amount for each checked school day. Changes apply to unchecked savings."
            : "Add savings whenever you choose. Earlier fixed-day checks remain available in fund details."}
        </p>
        <details
          className="additional-details"
          open={fund?.goal ? true : undefined}
        >
          <summary>Additional details</summary>
          <div>
            <label>
              Goal amount <span className="optional">optional</span>
              <span className="money-input">
                <span>₱</span>
                <input
                  name="goal"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="1000000000"
                  step="0.01"
                  placeholder="e.g. 1000"
                  defaultValue={fund?.goal ? amountText(fund.goal) : ""}
                />
              </span>
            </label>
            {!fund && (
              <AmountField label="Already saved" value="0.00" allowZero />
            )}
            <p className="field-help">
              {fund
                ? "To correct a starting balance, edit its entry in History."
                : "Already saved money becomes a starting balance. It won’t reduce your allowance."}
            </p>
          </div>
        </details>
      </Form>
    </Modal>
  );
}
function EntryList({
  entries,
  book,
  edit,
  remove,
  clearFilters,
  grouped = false,
  preview = false,
  history = false,
  oldestFirst = false,
}: {
  history?: boolean;
  oldestFirst?: boolean;
  grouped?: boolean;
  preview?: boolean;
  entries: Entry[];
  book: Notebook;
  edit(entry: Entry): void;
  remove(entry: Entry): void;
  clearFilters?: () => void;
}) {
  if (!grouped && entries.length) {
    const openings = entries.filter((e) => e.kind.startsWith("opening_"));
    const ordinary = entries.filter((e) => !e.kind.startsWith("opening_"));
    const dates = [...new Set(ordinary.map((e) => e.date))].sort();
    if (!oldestFirst) dates.reverse();
    return (
      <div className="dated-entries">
        {dates.map((date) => (
          <section key={date} className="entry-date-group">
            <h3 className={history ? "history-date-heading" : undefined}>
              <span>
                {history && <CalendarDays size={16} aria-hidden="true" />}
                <time dateTime={date}>
                  {history
                    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : displayDate(date)}
                </time>
              </span>
            </h3>
            <EntryList
              grouped
              history={history}
              entries={ordinary.filter((e) => e.date === date)}
              book={book}
              edit={edit}
              remove={remove}
            />
          </section>
        ))}
        {!ordinary.length && (
          <p className="field-help">
            No transactions yet. <a href="#allowance">Add allowance</a> or{" "}
            <a href="#expenses">record an expense</a> to get started.
          </p>
        )}
        {openings.length > 0 && (
          <section className="entry-date-group starting-balances">
            <h3>Starting balances</h3>
            <EntryList
              grouped
              history={history}
              entries={openings}
              book={book}
              edit={edit}
              remove={remove}
            />
          </section>
        )}
      </div>
    );
  }
  if (!entries.length)
    return (
      <Empty
        title={
          clearFilters
            ? "No matching entries"
            : history
              ? "No transactions yet"
              : "A fresh page"
        }
        action={
          clearFilters ? (
            <button className="button secondary" onClick={clearFilters}>
              Clear filters
            </button>
          ) : (
            <a className="button secondary" href="#allowance">
              Go to daily check-in
            </a>
          )
        }
      >
        {clearFilters
          ? "Try a different date or clear your filters to see all records."
          : "Add allowance in Allowance or record spending in Expenses to fill this page."}
      </Empty>
    );
  return (
    <div className="entry-list">
      {entries.map((entry) => {
        const fund = book.funds.find((f) => f.id === entry.fundId);
        const incoming = [
          "allowance",
          "opening_allowance",
          "deposit",
          "opening_savings",
          "return",
        ].includes(entry.kind);
        const withdrawal = entry.kind === "return" || entry.kind === "spend";
        const displayIncoming = history && withdrawal ? false : incoming;
        const badge = entry.kind.startsWith("opening_")
          ? "Starting balance"
          : entry.kind === "allowance"
            ? "Allowance"
            : entry.kind === "expense"
              ? "Expense"
              : entry.kind === "deposit"
                ? "Savings"
                : entry.kind === "return"
                  ? "Withdrawal"
                  : "Savings spent";
        const context = !history
          ? [
              labels[entry.kind],
              fund?.name,
              entry.source
                ? entry.source === "allowance"
                  ? "Allowance"
                  : "Extra money"
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : [
              withdrawal ? labels[entry.kind] : null,
              fund?.name,
              entry.source
                ? entry.source === "allowance"
                  ? "Allowance"
                  : "Extra money"
                : null,
              entry.allowanceDayNumber
                ? `Day ${entry.allowanceDayNumber} · Allowance`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
        const Icon = history
          ? withdrawal
            ? ArrowDownToLine
            : entry.kind === "allowance" || entry.kind === "opening_allowance"
              ? Wallet
              : entry.kind === "deposit" || entry.kind === "opening_savings"
                ? Sprout
                : ArrowUpRight
          : entry.kind === "deposit" || entry.kind === "opening_savings"
            ? Sprout
            : entry.kind === "return"
              ? ArrowLeftRight
              : incoming
                ? ArrowDownLeft
                : ArrowUpRight;
        return (
          <div
            className={`entry-row${preview ? " recent-entry" : ""}${history ? ` history-entry entry-kind-${entry.kind}` : ""}`}
            key={entry.id}
          >
            <span
              className={`entry-symbol ${entry.kind === "deposit" || entry.kind === "opening_savings" ? "savings-symbol" : incoming ? "green" : "peach"}`}
            >
              <Icon size={19} />
            </span>
            <div className="entry-description">
              <strong>{entry.note || labels[entry.kind]}</strong>
              {context && <span>{context}</span>}
              <time dateTime={entry.date}>{displayDate(entry.date)}</time>
            </div>
            {history && (
              <span className={`history-entry-kind kind-${entry.kind}`}>
                {badge}
              </span>
            )}
            <div className="entry-end">
              <strong className={displayIncoming ? "positive" : ""}>
                {entry.kind.startsWith("opening_")
                  ? ""
                  : displayIncoming
                    ? "+"
                    : "−"}
                {money(entry.amount)}
              </strong>
              {preview && (
                <time className="entry-preview-date" dateTime={entry.date}>
                  {new Date(`${entry.date}T12:00:00`).toLocaleDateString(
                    "en-PH",
                    {
                      month: "short",
                      day: "numeric",
                      ...(entry.date.slice(0, 4) !== localDate().slice(0, 4)
                        ? { year: "numeric" }
                        : {}),
                    },
                  )}
                </time>
              )}
              <ActionMenu
                label={`Actions for ${entry.note || labels[entry.kind]} on ${displayDate(entry.date)}`}
                className="entry-actions"
                floating={history}
              >
                <button
                  onClick={() => edit(entry)}
                  aria-label={`Edit ${entry.note || labels[entry.kind]}`}
                >
                  {history && <Pencil size={16} aria-hidden="true" />}Edit
                </button>
                <button
                  className="danger"
                  onClick={() => remove(entry)}
                  aria-label={`Delete ${entry.note || labels[entry.kind]}`}
                >
                  {history && <Trash2 size={16} aria-hidden="true" />}Delete
                </button>
              </ActionMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function FundCard({
  fund,
  balance,
  deposit,
  withdraw,
  edit,
  archive,
  compact = false,
}: {
  fund: Fund;
  balance: number;
  deposit(): void;
  withdraw(): void;
  edit(): void;
  archive(): void;
  compact?: boolean;
}) {
  const percent = fund.goal
    ? Math.min(100, Math.round((balance / fund.goal) * 100))
    : null;
  return (
    <article className={`fund-card ${fund.archived ? "archived" : ""}`}>
      <div className="fund-top">
        <span className="fund-symbol">
          <Sprout size={20} />
        </span>
        {fund.archived && <span className="badge">Archived</span>}
        {!compact && (
          <button
            className="icon-button"
            onClick={edit}
            aria-label={`Edit ${fund.name}`}
          >
            <Ellipsis size={21} />
          </button>
        )}
      </div>
      <h3>{fund.name}</h3>
      <div className="fund-value">{money(balance)}</div>
      {fund.goal ? (
        <>
          <div
            className="progress"
            role="progressbar"
            aria-label={`${fund.name} goal progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent!}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="goal-caption">
            <span>of {money(fund.goal)}</span>
            <span>{percent}%</span>
          </div>
        </>
      ) : (
        <p className="no-goal">A little more, whenever you can.</p>
      )}
      {!compact && (
        <>
          <div className="fund-buttons">
            {!fund.archived && (
              <button className="button soft" onClick={deposit}>
                <Plus size={15} />
                Add savings
              </button>
            )}
            <button
              className="button quiet"
              onClick={withdraw}
              disabled={balance === 0}
            >
              Take out
            </button>
          </div>
          <button className="archive-button" onClick={archive}>
            {fund.archived ? "Restore fund" : "Archive fund"}
          </button>
        </>
      )}
    </article>
  );
}
function SettingsPage({
  book,
  notify,
  install,
  installed,
}: {
  book: Notebook;
  notify(message: string): void;
  install: InstallEvent | null;
  installed: boolean;
}) {
  const [pending, setPending] = useState<Notebook | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function restore() {
    if (!pending || busy) return;
    setBusy(true);
    setError("");
    try {
      await changeNotebook(() => pending, true);
      setPending(null);
      notify("Your backup has been restored.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const blob = new Blob([exportBackup(book)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pomi-backup-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exported. Keep it somewhere safe.");
  }
  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>
          My notebook settings<span>.</span>
        </h1>
        <p>A little housekeeping for your money notes.</p>
      </header>
      <section className="panel settings-panel">
        <div className="section-title">
          <h2>A copy for safekeeping</h2>
          <Download size={20} />
        </div>
        <p>
          Your notes live on this device. Export a backup before clearing
          browser data or moving to another device.
        </p>
        <div className="settings-actions">
          <button className="button primary" onClick={download}>
            <Download size={17} />
            Export backup
          </button>
          <button
            className="button secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload size={17} />
            Restore backup
          </button>
        </div>
        <input
          className="visually-hidden"
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose Pomi backup"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            setPending(null);
            try {
              if (file.size > 20_000_000)
                throw new Error("Choose a backup smaller than 20 MB.");
              setPending(importBackup(await file.text()));
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      <section className="panel settings-panel">
        <div className="section-title">
          <h2>A home on your screen</h2>
          <House size={20} />
        </div>
        <p>
          {installed
            ? "Pomi is running as an installed app."
            : "Install Pomi for a space of its own. Your notebook works offline once the app is ready."}
        </p>
        {install && !installed ? (
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await install.prompt();
                await install.userChoice;
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Install Pomi
            <ArrowDownToLine size={17} />
          </button>
        ) : (
          !installed && (
            <p className="field-help">
              On iPhone or iPad, open in Safari, choose Share, then Add to Home
              Screen. In other supported browsers, look for Install app in the
              browser menu. Production hosting needs HTTPS.
            </p>
          )
        )}
      </section>
      <section className="panel settings-panel">
        <div className="section-title">
          <h2>Small, simple, yours</h2>
          <Leaf size={20} />
        </div>
        <dl className="preferences">
          <div>
            <dt>Currency</dt>
            <dd>Philippine peso (PHP)</dd>
          </div>
          <div>
            <dt>Allowance</dt>
            <dd>Recorded manually · carries forward</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>On this device · no account or sync</dd>
          </div>
        </dl>
        <p className="field-help">
          I’m Pomi, your little allowance and savings notebook. Version 0.1.0.
        </p>
      </section>
      {pending && (
        <Modal
          title="Replace my notebook?"
          close={() => {
            if (!busy) setPending(null);
          }}
        >
          <p className="modal-copy">
            This backup has {pending.funds.length} funds and{" "}
            {pending.entries.length} entries, with{" "}
            {money(totals(pending).allowance)} available allowance and{" "}
            {money(totals(pending).savings)} in savings.
          </p>
          <p className="error">
            Restoring replaces every current fund and entry on this device.
            Export your current notebook first if you want to keep it.
          </p>
          <div className="settings-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Keep my notebook
            </button>
            <button className="button danger" disabled={busy} onClick={restore}>
              {busy ? "Restoring…" : "Replace and restore"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [openError, setOpenError] = useState("");
  useEffect(() => {
    let active = true;
    openNotebook().then(
      () => {
        if (!active) return;
        setReady(true);
        navigator.storage?.persist?.().catch(() => {});
      },
      (error) => {
        if (active) setOpenError(errorMessage(error));
      },
    );
    return () => {
      active = false;
    };
  }, []);
  const loaded = useLiveQuery(async () => {
    if (openError) return { book: null, error: openError };
    if (!ready) return undefined;
    try {
      return {
        book: validateNotebook(await db.notebooks.get("main")),
        error: "",
      };
    } catch (e) {
      return { book: null, error: errorMessage(e) };
    }
  }, [ready, openError]);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [modal, setModal] = useState<ModalState>(null);
  const [allowanceConfirmation, setAllowanceConfirmation] =
    useState<PendingAllowanceConfirmation | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>();
  const [expenseSelection, setExpenseSelection] = useState<{
    periodId: string;
    dayNumber: number;
  }>();
  const [today, setToday] = useState(localDate);
  const [railTooltip, setRailTooltip] = useState<{
    label: string;
    top: number;
  }>();
  const tooltipTimer = useRef<number | undefined>(undefined);
  function confirmAllowance(message: string) {
    return new Promise<boolean>((resolve) =>
      setAllowanceConfirmation({ message, resolve }),
    );
  }
  function resolveAllowanceConfirmation(confirmed: boolean) {
    allowanceConfirmation?.resolve(confirmed);
    setAllowanceConfirmation(null);
  }
  function hideRailTooltip() {
    window.clearTimeout(tooltipTimer.current);
    tooltipTimer.current = window.setTimeout(
      () => setRailTooltip(undefined),
      200,
    );
  }
  function showRailTooltip(target: HTMLElement, label: string) {
    window.clearTimeout(tooltipTimer.current);
    if (!sidebarCollapsed || window.innerWidth <= 760) return;
    const rect = target.getBoundingClientRect();
    setRailTooltip({ label, top: rect.top + rect.height / 2 });
  }
  useEffect(() => {
    const hide = () => {
      window.clearTimeout(tooltipTimer.current);
      setRailTooltip(undefined);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", escape);
      window.clearTimeout(tooltipTimer.current);
    };
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pomi-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pomi-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      /* Keep the current view when storage is unavailable. */
    }
  }, [sidebarCollapsed]);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60_000);
    return () => clearInterval(timer);
  }, []);
  function selectPeriod(id: string) {
    setSelectedPeriodId(id);
    setExpenseSelection(undefined);
    setExpenseDetailsOpen(true);
  }

  const [focusDay, setFocusDay] = useState<{
    periodId: string;
    dayNumber: number;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [fundViewSelection, setFundViewSelection] = useState<{
    fundId: string;
    hasChecklist: boolean;
    view: "checklist" | "details";
  }>();
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(true);
  const [selectedFundId, setSelectedFundId] = useState<string>();
  const [fundFilter, setFundFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [historyOrder, setHistoryOrder] = useState("newest");
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(
    matchMedia("(display-mode: standalone)").matches,
  );
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setError(
        "Offline setup didn’t finish. Reopen Pomi with an internet connection to try again.",
      ),
  });
  useEffect(() => {
    const hash = () => {
      setPage(pageFromHash());
      setModal(null);
      setError("");
    };
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const didInstall = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", didInstall);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", didInstall);
    };
  }, []);
  // Success notices have no required action; errors remain until resolved.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      if (!document.activeElement?.closest(".save-message")) setToast("");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const funds =
      loaded?.book?.funds.filter((fund) => showArchived || !fund.archived) ??
      [];
    setSelectedFundId((current) =>
      funds.some((fund) => fund.id === current) ? current : funds[0]?.id,
    );
  }, [loaded?.book?.funds, showArchived]);
  const previousPage = useRef(page);
  useEffect(() => {
    if (!loaded?.book) return;
    const changed = previousPage.current !== page;
    previousPage.current = page;
    document.title = `${pages.find((p) => p.id === page)?.label ?? "Home"} · Pomi`;
    if (!changed && !focusDay) return;
    if (focusDay && page !== "allowance") return;
    const frame = requestAnimationFrame(() => {
      const target =
        focusDay && page === "allowance"
          ? document.getElementById(
              `checkin-day-${focusDay.periodId}-${focusDay.dayNumber}`,
            )
          : document.querySelector<HTMLElement>("#main-content h1");
      target?.focus({ preventScroll: true });
      if (focusDay) {
        target?.scrollIntoView({ block: "center" });
        setFocusDay(null);
      } else window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [page, !!loaded?.book, focusDay]);
  if (!loaded)
    return (
      <main className="loading">
        <Sprout size={38} />
        <p>Opening your notebook…</p>
      </main>
    );
  if (!loaded.book)
    return (
      <main className="loading">
        <h1 tabIndex={-1}>Your notebook couldn’t open</h1>
        <p role="alert">{loaded.error}</p>
        <p>
          Try reloading or allowing this site to store data. Your records have
          not been cleared.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  const book = loaded.book;
  const balances = totals(book);
  const selectedPeriod =
    book.periods.find((period) => period.id === selectedPeriodId) ??
    book.periods.at(-1);
  const selectedDayNumber = selectedPeriod
    ? expenseSelection?.periodId === selectedPeriod.id &&
      selectedPeriod.days[expenseSelection.dayNumber - 1]
      ? expenseSelection.dayNumber
      : Math.max(
          1,
          selectedPeriod.days.findIndex(
            (day) => day.date === today && !day.noClass,
          ) + 1 || selectedPeriod.days.findIndex((day) => !day.noClass) + 1,
        )
    : undefined;
  const selectedDay =
    selectedPeriod && selectedDayNumber
      ? selectedPeriod.days[selectedDayNumber - 1]
      : undefined;
  const selectedDailyBalance =
    selectedPeriod && selectedDayNumber
      ? dailyBalance(book, selectedPeriod, selectedDayNumber)
      : undefined;
  function openDay(periodId: string, dayNumber: number) {
    selectPeriod(periodId);
    setFocusDay({ periodId, dayNumber });
    location.hash = "allowance";
  }
  function recordDayExpense(periodId: string, dayNumber: number) {
    setModal({
      type: "entry",
      kind: "expense",
      allowancePeriodId: periodId,
      allowanceDayNumber: dayNumber,
    });
  }
  const sorted = [...book.entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
  const recentEntries = sorted
    .filter((e) => !(e.kind.startsWith("opening_") && e.amount === 0))
    .slice(0, 3);
  const visibleFunds = book.funds.filter(
    (fund) => showArchived || !fund.archived,
  );
  const selectedFund =
    visibleFunds.find((fund) => fund.id === selectedFundId) ?? visibleFunds[0];
  const fundHasChecklist = (fund: Fund) =>
    fund.savingMode === "fixed" ||
    book.entries.some((entry) => entry.fundId === fund.id && !!entry.dayNumber);
  const selectedFundHasChecklist =
    !!selectedFund && fundHasChecklist(selectedFund);
  const fundView =
    fundViewSelection?.fundId === selectedFund?.id &&
    fundViewSelection?.hasChecklist === selectedFundHasChecklist
      ? fundViewSelection.view
      : selectedFundHasChecklist
        ? "checklist"
        : "details";
  function setFundView(view: "checklist" | "details") {
    if (selectedFund)
      setFundViewSelection({
        fundId: selectedFund.id,
        hasChecklist: selectedFundHasChecklist,
        view,
      });
  }
  const expenseEntries = sorted.filter((entry) => entry.kind === "expense");
  const selectedDayExpenses =
    selectedPeriod && selectedDayNumber
      ? expenseEntries.filter(
          (entry) =>
            (entry.allowancePeriodId === selectedPeriod.id &&
              entry.allowanceDayNumber === selectedDayNumber) ||
            (entry.periodId === selectedPeriod.id &&
              entry.dayNumber === selectedDayNumber),
        )
      : [];
  const historyFiltered = sorted.filter(
    (entry) =>
      (!fundFilter ||
        (fundFilter === "allowance"
          ? !entry.fundId ||
            entry.kind === "return" ||
            entry.source === "allowance"
          : entry.fundId === fundFilter)) &&
      (!typeFilter || entry.kind === typeFilter) &&
      (!from || entry.date >= from) &&
      (!to || entry.date <= to),
  );
  const historyEntries =
    historyOrder === "oldest"
      ? [...historyFiltered].reverse()
      : historyFiltered;
  const historyTransactions = historyEntries.filter(
    (entry) => !entry.kind.startsWith("opening_"),
  );
  const hasHistoryFilters = !!(fundFilter || typeFilter || from || to);
  const historySummary = historyTransactions.reduce(
    (summary, entry) => {
      if (entry.kind === "allowance") summary.received += entry.amount;
      if (entry.kind === "expense") summary.expenses += entry.amount;
      if (entry.kind === "deposit") summary.deposits += entry.amount;
      if (entry.kind === "return" || entry.kind === "spend")
        summary.withdrawals += entry.amount;
      return summary;
    },
    { received: 0, expenses: 0, deposits: 0, withdrawals: 0 },
  );
  const invalidHistoryRange = !!(from && to && from > to);
  function clearHistoryFilters() {
    setFundFilter("");
    setTypeFilter("");
    setFrom("");
    setTo("");
    document.getElementById("select-6")?.focus();
  }
  const totalSpent = expenseEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  const homePeriod =
    [...book.periods]
      .reverse()
      .find((period) => period.days.some((day) => day.date === today)) ??
    selectedPeriod;
  const homeDayIndex =
    homePeriod?.days.findIndex((day) => day.date === today) ?? -1;
  const homeDay = homePeriod?.days[homeDayIndex];
  const activeFunds = book.funds.filter((f) => !f.archived);
  const goalFunds = activeFunds.filter((fund) => fund.goal);
  const savingsGoal = goalFunds.reduce((sum, fund) => sum + fund.goal!, 0);
  const savingsGoalBalance = goalFunds.reduce(
    (sum, fund) => sum + Math.min(balances.funds[fund.id], fund.goal!),
    0,
  );

  function editEntry(entry: Entry) {
    if (entry.periodId && entry.dayNumber) {
      selectPeriod(entry.periodId);
      setFocusDay({ periodId: entry.periodId, dayNumber: entry.dayNumber });
      if (location.hash !== "#allowance") location.hash = "allowance";
      else setPage("allowance");
    } else
      setModal(
        entry.periodId
          ? { type: "period", periodId: entry.periodId }
          : { type: "entry", kind: entry.kind, entry },
      );
  }
  async function removeEntry(entry: Entry) {
    if (
      !confirm(
        `Delete this ${labels[entry.kind].toLowerCase()} of ${money(entry.amount)}? Your balances will be recalculated.`,
      )
    )
      return;
    try {
      if (
        await commit(
          (current) =>
            entry.periodId
              ? entry.dayNumber === undefined
                ? removePeriod(current, entry.periodId)
                : entry.kind === "deposit"
                  ? setSavingsDay(
                      current,
                      entry.periodId,
                      entry.dayNumber,
                      entry.fundId!,
                      false,
                    )
                  : setAllowanceDay(
                      current,
                      entry.periodId,
                      entry.dayNumber,
                      false,
                    )
              : withoutEntry(current, entry.id),
          confirmAllowance,
        )
      ) {
        setToast("Entry deleted. Balances updated.");
        if (page === "history")
          requestAnimationFrame(() =>
            document.getElementById("history-transactions-title")?.focus(),
          );
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function archiveFund(fund: Fund) {
    try {
      await changeNotebook((current) => ({
        ...current,
        funds: current.funds.map((f) =>
          f.id === fund.id ? { ...f, archived: !f.archived } : f,
        ),
      }));
      setToast(
        fund.archived
          ? "Fund restored."
          : "Fund archived. Its balance and history are kept.",
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const entryButton = (
    kind: Kind,
    label: string,
    className = "button primary",
  ) => (
    <button
      className={className}
      onClick={() =>
        setModal(
          kind === "allowance" ? { type: "period" } : { type: "entry", kind },
        )
      }
    >
      <Plus size={17} />
      {label}
    </button>
  );
  const renderFund = (fund: Fund, compact = false) => (
    <FundCard
      key={fund.id}
      fund={fund}
      balance={balances.funds[fund.id]}
      compact={compact}
      deposit={() =>
        setModal({ type: "entry", kind: "deposit", fundId: fund.id })
      }
      withdraw={() =>
        setModal({ type: "entry", kind: "return", fundId: fund.id })
      }
      edit={() => setModal({ type: "fund", fund })}
      archive={() => archiveFund(fund)}
    />
  );
  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Pomi home">
          <span className="brand-mark">
            <Sticker kind="bow" />
          </span>
          <span className="brand-name">
            pomi<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="brand-caption">Allowance & savings</p>
        <div className="sidebar-body">
          <nav id="sidebar-navigation" aria-label="Main navigation">
            {pages.map(({ id, label, icon: Icon }) => (
              <a
                href={`#${id}`}
                key={id}
                className={`nav-item${page === id ? " active" : ""}${id === "settings" ? " desktop-settings" : ""}`}
                aria-current={page === id ? "page" : undefined}
                onMouseEnter={(event) =>
                  showRailTooltip(event.currentTarget, label)
                }
                onMouseLeave={hideRailTooltip}
                onFocus={(event) => showRailTooltip(event.currentTarget, label)}
                onBlur={() => setRailTooltip(undefined)}
                aria-describedby={
                  railTooltip?.label === label ? "rail-tooltip" : undefined
                }
              >
                <Icon size={20} />
                <span>{label}</span>
                {page === id && <span className="nav-dot" />}
              </a>
            ))}
          </nav>
        </div>
        <div className="sidebar-controls">
          <button
            type="button"
            className="icon-button sidebar-toggle"
            onClick={() => {
              setSidebarCollapsed((collapsed) => !collapsed);
              setRailTooltip(undefined);
            }}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}
            aria-controls="sidebar-navigation"
            onMouseEnter={(event) =>
              showRailTooltip(event.currentTarget, "Expand sidebar")
            }
            onMouseLeave={hideRailTooltip}
            onFocus={(event) =>
              showRailTooltip(event.currentTarget, "Expand sidebar")
            }
            onBlur={() => setRailTooltip(undefined)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>
      {railTooltip && sidebarCollapsed && (
        <div
          id="rail-tooltip"
          className="rail-tooltip"
          role="tooltip"
          style={{ top: railTooltip.top }}
          onMouseEnter={() => window.clearTimeout(tooltipTimer.current)}
          onMouseLeave={hideRailTooltip}
        >
          {railTooltip.label}
        </div>
      )}
      <div className="workspace">
        <main className="main-content" id="main-content" tabIndex={-1}>
          <div className="mobile-toolbar">
            <a
              className="button secondary"
              href="#settings"
              aria-current={page === "settings" ? "page" : undefined}
            >
              <Settings size={18} aria-hidden="true" />
              Settings
            </a>
          </div>
          <div className="save-message" role="status">
            <span>{toast}</span>
            {toast && (
              <>
                <Check size={16} aria-hidden="true" />
                <button
                  className="icon-button"
                  onClick={() => setToast("")}
                  aria-label="Dismiss notification"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {needRefresh && (
            <div className="notice">
              <span>
                A new version of Pomi is ready. Save your open entries before
                updating.
              </span>
              <button onClick={() => updateServiceWorker(true)}>
                Update app
              </button>
            </div>
          )}
          {error && (
            <div className="error global-error" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}
          <SavingsReminder book={book} period={selectedPeriod} />
          {page === "home" && (
            <div className="home-dashboard">
              <header className="page-heading home-heading">
                <div>
                  <h1 tabIndex={-1}>
                    My money, at a glance<span>.</span>
                    <Sticker kind="bow" />
                  </h1>
                  <p>A little for today. A little for your dreams.</p>
                </div>
                <span className="today-label">
                  <CalendarDays size={16} aria-hidden="true" />
                  {new Date(`${today}T12:00:00`).toLocaleDateString("en-PH", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </header>
              <div className="dashboard-overview">
                <div className="balance-grid summary-group summary-group-three">
                  <section
                    className="allowance-card financial-summary summary-allowance"
                    aria-label="Available allowance"
                  >
                    <div className="balance-information">
                      <span className="balance-label summary-label">
                        Available allowance
                      </span>
                      <div
                        className={`hero-balance summary-amount ${balances.allowance < 0 ? "over-budget" : ""}`}
                      >
                        {money(balances.allowance)}
                      </div>
                    </div>
                    <div className="balance-footer">
                      <p>
                        {balances.allowance < 0
                          ? "Below zero"
                          : "Remaining balance"}
                      </p>
                      <div className="balance-actions">
                        {entryButton(
                          "allowance",
                          "Add allowance",
                          "button secondary",
                        )}
                      </div>
                    </div>
                  </section>
                  <section
                    className="savings-summary financial-summary summary-savings"
                    aria-label="Total savings"
                  >
                    <span className="balance-label summary-label">
                      Total savings
                    </span>
                    <div className="hero-balance summary-amount">
                      {money(balances.savings)}
                    </div>
                  </section>
                  <section
                    className="home-expenses financial-summary summary-spending"
                    aria-label="Expenses summary"
                  >
                    <span className="balance-label summary-label">
                      Total expenses
                    </span>
                    <div
                      className="hero-balance summary-amount"
                      data-testid="home-expenses-total"
                    >
                      {money(totalSpent)}
                    </div>
                    <div className="balance-footer">
                      <div className="balance-actions">
                        {entryButton(
                          "expense",
                          "Record expense",
                          "button secondary",
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <div className="home-checkin-row">
                <section
                  className="panel home-daily-checkin"
                  aria-label="Daily check-in"
                >
                  <CalendarCheck size={24} aria-hidden="true" />
                  <div>
                    <h2>Daily check-in</h2>
                    <p>
                      {homeDay
                        ? `${displayDate(today)} · Day ${homeDayIndex + 1}${homeDay.noClass ? " · No class" : homePeriod && dayStatus(book, homePeriod, homeDayIndex) === "Savings Completed" ? " · Savings completed" : ""}`
                        : homePeriod
                          ? "No school day scheduled today."
                          : "Set up your allowance and savings days."}
                    </p>
                  </div>
                  <CheckInLink
                    book={book}
                    period={homePeriod}
                    openDay={(day) => {
                      if (homePeriod) openDay(homePeriod.id, day);
                    }}
                  />
                </section>
                <WeeklySavings
                  book={book}
                  period={homePeriod}
                  compact
                  openDay={(day) => {
                    if (homePeriod) openDay(homePeriod.id, day);
                  }}
                />
              </div>
              <div className="dashboard-details">
                <section
                  className="panel dashboard-funds"
                  aria-label="Savings funds preview"
                >
                  <div className="section-title">
                    <h2>
                      <Sprout size={20} aria-hidden="true" />
                      Savings funds
                    </h2>
                    <a href="#savings">
                      All funds
                      <ChevronRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                  <div className="home-funds">
                    {activeFunds.slice(0, 3).map((fund) => {
                      const balance = balances.funds[fund.id];
                      const percent = fund.goal
                        ? Math.min(100, Math.round((balance / fund.goal) * 100))
                        : null;
                      return (
                        <a
                          className="home-fund-summary"
                          href="#savings"
                          onClick={() => setSelectedFundId(fund.id)}
                          key={fund.id}
                          aria-label={`${fund.name}: ${money(balance)}${fund.goal ? `, ${percent}% of ${money(fund.goal)} goal` : ""}`}
                        >
                          <span className="home-fund-icon">
                            <Sprout size={18} aria-hidden="true" />
                          </span>
                          <span className="home-fund-content">
                            <span className="home-fund-heading">
                              <strong>{fund.name}</strong>
                              <span>{money(balance)}</span>
                            </span>
                            {fund.goal && (
                              <>
                                <span className="progress" aria-hidden="true">
                                  <span style={{ width: `${percent}%` }} />
                                </span>
                              </>
                            )}
                          </span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </a>
                      );
                    })}
                    {!activeFunds.length && (
                      <Empty title="A place for your next goal">
                        <a href="#savings">Create a savings fund</a>
                      </Empty>
                    )}
                  </div>

                  <div className="home-funds-actions">
                    <button
                      className="button secondary"
                      onClick={() => setModal({ type: "fund" })}
                    >
                      <Plus size={16} aria-hidden="true" />
                      New fund
                    </button>
                  </div>
                </section>
                <section
                  className="panel recent-panel"
                  aria-label="Recent activity"
                >
                  <div className="section-title">
                    <h2>
                      <History size={20} aria-hidden="true" />
                      Recent activity
                    </h2>
                    <a href="#history">
                      View history
                      <ChevronRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                  {recentEntries.length ? (
                    <EntryList
                      grouped
                      preview
                      entries={recentEntries}
                      book={book}
                      edit={editEntry}
                      remove={removeEntry}
                    />
                  ) : (
                    <p className="home-activity-empty">
                      No activity yet. Add allowance above or{" "}
                      <a href="#expenses">record an expense in Expenses</a> to
                      start your notebook.
                    </p>
                  )}
                </section>
              </div>
            </div>
          )}
          {page === "allowance" && (
            <>
              <header className="page-heading action-heading">
                <div>
                  <h1 tabIndex={-1}>
                    My allowance<span>.</span>
                  </h1>
                  <p>Your allowance and savings, one day at a time.</p>
                </div>
              </header>
              <div
                className="allowance-summary allowance-page-summary summary-group summary-group-three"
                aria-label="Notebook balances"
              >
                <div className="financial-summary summary-allowance">
                  <span className="summary-label">Available allowance</span>
                  <strong
                    className="summary-amount"
                    data-testid="allowance-balance"
                  >
                    {money(balances.allowance)}
                  </strong>
                  {!book.periods.length && (
                    <div className="summary-actions">
                      {entryButton("allowance", "Add allowance")}
                    </div>
                  )}
                </div>
                <div className="allowance-saved financial-summary summary-savings">
                  <span className="summary-label">Total savings</span>
                  <strong
                    className="summary-amount"
                    data-testid="savings-balance"
                  >
                    {money(balances.savings)}
                  </strong>
                </div>
                <div className="allowance-spent financial-summary summary-spending">
                  <span className="summary-label">Total spent</span>
                  <strong className="summary-amount">
                    {money(totalSpent)}
                  </strong>
                </div>
              </div>
              {book.periods.length > 0 && (
                <div className="period-toolbar">
                  <PeriodSelector
                    book={book}
                    periodId={selectedPeriod?.id}
                    select={selectPeriod}
                  />
                  {selectedPeriod && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        setModal({
                          type: "period",
                          periodId: selectedPeriod.id,
                        })
                      }
                    >
                      Edit period
                    </button>
                  )}
                </div>
              )}
              <section
                className="panel section-block checkin-section"
                aria-label="Daily check-in"
              >
                {!book.periods.length ? (
                  <div className="welcome-guide">
                    <Sticker kind="heart" />
                    <h3>Start a new page</h3>
                    <p>
                      Give your allowance a plan. Your daily checklist will
                      appear here.
                    </p>
                    <ol>
                      <li>
                        <strong>Add your allowance</strong>
                        <span>
                          Enter the total, daily amount, and number of days.
                        </span>
                      </li>
                      <li>
                        <strong>Start a day</strong>
                        <span>
                          Set aside its daily budget, then record what you
                          spend.
                        </span>
                      </li>
                      <li>
                        <strong>Mark what you saved</strong>
                        <span>
                          Record spending and savings against that day’s budget.
                        </span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  <>
                    <div className="allowance-list-heading">
                      <div>
                        <h2>Daily allowance</h2>
                      </div>
                      {entryButton("allowance", "Add allowance")}
                    </div>
                    {selectedPeriod && (
                      <article
                        className="allowance-period"
                        key={selectedPeriod.id}
                      >
                        <DailyCheckIn
                          book={book}
                          period={selectedPeriod}
                          confirmAllowance={confirmAllowance}
                        />
                      </article>
                    )}
                  </>
                )}
              </section>
            </>
          )}
          {page === "savings" && (
            <>
              <header className="page-heading action-heading">
                <div>
                  <span className="eyebrow">ROOM FOR WHAT MATTERS</span>
                  <h1>
                    My savings funds<span>.</span>
                  </h1>
                  <p>Different dreams. A little money put aside for each.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setModal({ type: "fund" })}
                >
                  <Plus size={18} />
                  New fund
                </button>
              </header>
              <div className="savings-overview">
                <span>Total tucked away</span>
                <strong>{money(balances.savings)}</strong>
                <p>Includes money in archived funds.</p>
              </div>
              <div className="section-title">
                <h2>{showArchived ? "All my funds" : "My active funds"}</h2>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                  />
                  Show archived
                </label>
              </div>
              <div className="fund-grid">
                {book.funds
                  .filter((f) => showArchived || !f.archived)
                  .map((f) => renderFund(f))}
              </div>
              {!book.funds.some((f) => showArchived || !f.archived) && (
                <Empty title="Make room for a new goal">
                  Create a fund or show your archived funds to restore one.
                </Empty>
              )}
            </>
          )}
          {page === "history" && (
            <>
              <header className="page-heading">
                <span className="eyebrow">EVERY LITTLE NOTE</span>
                <h1>
                  My money history<span>.</span>
                </h1>
                <p>A record of what came in, went out, and stayed for later.</p>
              </header>
              <div className="filters">
                <label>
                  Fund
                  <select
                    value={fundFilter}
                    onChange={(event) => setFundFilter(event.target.value)}
                  >
                    <option value="">All accounts</option>
                    <option value="allowance">Allowance only</option>
                    {book.funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.archived ? " (archived)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Entry type
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    <option value="">All types</option>
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  From
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </label>
              </div>
              {from && to && from > to && (
                <p role="alert" className="error">
                  Choose an end date on or after the start date.
                </p>
              )}
              <section className="panel history-panel">
                <EntryList
                  entries={sorted.filter(
                    (e) =>
                      (!fundFilter ||
                        (fundFilter === "allowance"
                          ? !e.fundId ||
                            e.kind === "return" ||
                            e.source === "allowance"
                          : e.fundId === fundFilter)) &&
                      (!typeFilter || e.kind === typeFilter) &&
                      (!from || e.date >= from) &&
                      (!to || e.date <= to),
                  )}
                  book={book}
                  edit={editEntry}
                  remove={removeEntry}
                />
              </section>
            </>
          )}
          {page === "settings" && (
            <SettingsPage
              book={book}
              notify={setToast}
              install={install}
              installed={installed}
            />
          )}
        </main>
      </div>
      {modal?.type === "period" && (
        <PeriodEditor
          key={modal.periodId ?? "new"}
          book={book}
          periodId={modal.periodId}
          close={() => setModal(null)}
          saved={setToast}
          confirmAllowance={confirmAllowance}
          selected={(id) => {
            selectPeriod(id);
            if (!modal.periodId && page === "home") location.hash = "allowance";
          }}
        />
      )}
      {modal?.type === "entry" && (
        <EntryEditor
          key={modal.entry?.id ?? `${modal.kind}-${modal.fundId ?? ""}`}
          state={modal}
          book={book}
          close={() => setModal(null)}
          saved={setToast}
          confirmAllowance={confirmAllowance}
        />
      )}
      {modal?.type === "fund" && (
        <FundEditor
          book={book}
          fund={modal.fund}
          close={() => setModal(null)}
          saved={setToast}
        />
      )}
      {allowanceConfirmation && (
        <Modal
          title="Record over budget?"
          close={() => resolveAllowanceConfirmation(false)}
        >
          <p className="modal-copy">{allowanceConfirmation.message}</p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => resolveAllowanceConfirmation(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => resolveAllowanceConfirmation(true)}
            >
              Record anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SchedulePreview({ period }: { period?: AllowancePeriod }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => {
      try {
        const data = new FormData(form);
        const dates = schoolDates(
          text(data, "startDate"),
          data.getAll("schoolDays").map(Number),
          Number(text(data, "dayCount")),
        );
        setPreview(
          `${displayDate(dates[0])} – ${displayDate(dates.at(-1)!)} · ${dates.length} school days`,
        );
      } catch {
        setPreview(
          "Choose a start date, at least one school weekday, and a number of days.",
        );
      }
    };
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);
  return (
    <div ref={ref} className="schedule-preview" role="status">
      <strong>School schedule</strong>
      <p>{preview}</p>
      {period && (
        <p className="field-help">
          Saving confirms these dates. Existing transaction dates and checked
          amounts stay unchanged.
        </p>
      )}
    </div>
  );
}
