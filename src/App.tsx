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
  Check,
  ChevronRight,
  Download,
  Ellipsis,
  History,
  House,
  Leaf,
  NotebookPen,
  Plus,
  Settings,
  Sprout,
  Sun,
  Upload,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import { AllowanceWarning, changeNotebook, db } from "./db";
import {
  emptyNotebook,
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

type Page = "home" | "savings" | "history" | "settings";
type ModalState =
  | { type: "entry"; kind: Kind; entry?: Entry; fundId?: string }
  | { type: "fund"; fund?: Fund }
  | null;
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const pages: { id: Page; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
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
    ? error.message
    : "Something went wrong. Please try again.";
const displayDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

async function commit(change: (book: Notebook) => Notebook): Promise<boolean> {
  try {
    await changeNotebook(change);
    return true;
  } catch (error) {
    if (!(error instanceof AllowanceWarning)) throw error;
    if (!window.confirm(error.message)) return false;
    await changeNotebook(change, true);
    return true;
  }
}
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
    ref.current?.showModal();
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
}: {
  children: ReactNode;
  submit(data: FormData): Promise<void>;
  label?: string;
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
    <form onSubmit={handle}>
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
  return (
    <label>
      {label}
      <span className="money-input">
        <span aria-hidden="true">₱</span>
        <input
          name={name}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={allowZero ? "0" : "0.01"}
          max="1000000000"
          required
          defaultValue={value}
          placeholder="0.00"
        />
      </span>
    </label>
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
        <NotebookPen size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Setup() {
  return (
    <main className="setup-page">
      <a className="brand" href="#home">
        <span className="brand-mark">
          <Sprout size={26} />
        </span>
        pomi<span className="brand-dot">.</span>
      </a>
      <section className="setup-card">
        <span className="eyebrow">A FRESH PAGE</span>
        <h1>
          A little care for
          <br />
          your money.
        </h1>
        <p className="intro">
          Your allowance, your savings, your own pace. Let’s start with what you
          already have.
        </p>
        <Form
          label="Open my notebook"
          submit={async (data) => {
            const allowance = parseAmount(text(data, "allowance"), true);
            const savings = parseAmount(text(data, "savings"), true);
            const name = text(data, "fundName").trim();
            const fund: Fund = {
              id: crypto.randomUUID(),
              name,
              goal: null,
              archived: false,
            };
            await changeNotebook((current) => {
              if (current.initialized)
                throw new Error(
                  "Your notebook is already set up. Reload to open it.",
                );
              return {
                ...emptyNotebook(),
                initialized: true,
                funds: [fund],
                entries: [
                  makeEntry("opening_allowance", allowance),
                  makeEntry("opening_savings", savings, { fundId: fund.id }),
                ],
              };
            });
            navigator.storage?.persist?.().catch(() => {});
          }}
        >
          <AmountField
            name="allowance"
            label="My available allowance"
            value="0.00"
            allowZero
          />
          <div className="form-divider" />
          <label>
            My first savings fund
            <input
              name="fundName"
              required
              maxLength={60}
              defaultValue="My savings"
              placeholder="e.g. Rainy day fund"
            />
          </label>
          <AmountField
            name="savings"
            label="Already saved in this fund"
            value="0.00"
            allowZero
          />
          <p className="field-help">
            These are starting balances, not new income. You can correct them
            later in History.
          </p>
        </Form>
      </section>
      <p className="setup-foot">
        <Leaf size={15} /> No account. Just your notebook, saved on this device.
      </p>
    </main>
  );
}
function EntryEditor({
  state,
  book,
  close,
  saved,
}: {
  state: Extract<ModalState, { type: "entry" }>;
  book: Notebook;
  close(): void;
  saved(message: string): void;
}) {
  const existing = state.entry;
  const kind = existing?.kind ?? state.kind;
  const needsFund = ["deposit", "return", "spend", "opening_savings"].includes(
    kind,
  );
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
            ? "Take out savings"
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
            })
          ) {
            saved(existing ? "Entry updated." : "A little note, saved.");
            close();
          }
        }}
      >
        {needsFund && (
          <label>
            Savings fund
            <select
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
            </select>
            <span className="field-help">
              Current balance: {money(balance)}
            </span>
          </label>
        )}
        <AmountField
          value={existing ? amountText(existing.amount) : undefined}
          allowZero={kind.startsWith("opening_")}
        />
        {kind === "deposit" && (
          <label>
            Where is this money from?
            <select
              value={source}
              onChange={(event) =>
                setSource(event.target.value as "allowance" | "extra")
              }
            >
              <option value="allowance">My allowance</option>
              <option value="extra">Extra money</option>
            </select>
            <span className="field-help">
              {source === "allowance"
                ? "This also reduces your available allowance."
                : "Your allowance balance stays the same."}
            </span>
          </label>
        )}
        {isWithdrawal && (
          <label>
            Where is this money going?
            <select
              value={withdrawal}
              onChange={(event) => setWithdrawal(event.target.value as Kind)}
            >
              <option value="return">Back to my allowance</option>
              <option value="spend">Spent directly from savings</option>
            </select>
            <span className="field-help">
              {withdrawal === "return"
                ? "This increases your available allowance."
                : "This records spending without changing your allowance."}
            </span>
          </label>
        )}
        <label>
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={existing?.date ?? localDate()}
          />
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
  close,
  saved,
}: {
  fund?: Fund;
  close(): void;
  saved(message: string): void;
}) {
  return (
    <Modal
      title={fund ? "Edit savings fund" : "Something to save for"}
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
          saved(fund ? "Fund updated." : "A new little beginning.");
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
              placeholder="No goal needed"
              defaultValue={fund?.goal ? amountText(fund.goal) : ""}
            />
          </span>
        </label>
        {!fund && <AmountField label="Already saved" value="0.00" allowZero />}
        <p className="field-help">
          {fund
            ? "To correct a starting balance, edit its entry in History."
            : "Already saved money becomes a starting balance. It won’t reduce your allowance."}
        </p>
      </Form>
    </Modal>
  );
}
function EntryList({
  entries,
  book,
  edit,
  remove,
}: {
  entries: Entry[];
  book: Notebook;
  edit(entry: Entry): void;
  remove(entry: Entry): void;
}) {
  if (!entries.length)
    return (
      <Empty title="A fresh page">
        Your money notes will appear here as you add them.
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
        const Icon =
          entry.kind === "deposit" || entry.kind === "opening_savings"
            ? Sprout
            : entry.kind === "return"
              ? ArrowLeftRight
              : incoming
                ? ArrowDownLeft
                : ArrowUpRight;
        return (
          <div className="entry-row" key={entry.id}>
            <span className={`entry-symbol ${incoming ? "green" : "peach"}`}>
              <Icon size={19} />
            </span>
            <div className="entry-description">
              <strong>{entry.note || labels[entry.kind]}</strong>
              <span>
                {labels[entry.kind]}
                {fund ? ` · ${fund.name}` : ""}
                {entry.source
                  ? ` · ${entry.source === "allowance" ? "Allowance" : "Extra money"}`
                  : ""}
              </span>
              <time dateTime={entry.date}>{displayDate(entry.date)}</time>
            </div>
            <div className="entry-end">
              <strong className={incoming ? "positive" : ""}>
                {incoming ? "+" : "−"}
                {money(entry.amount)}
              </strong>
              <div className="entry-actions">
                <button
                  onClick={() => edit(entry)}
                  aria-label={`Edit ${entry.note || labels[entry.kind]}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(entry)}
                  aria-label={`Delete ${entry.note || labels[entry.kind]}`}
                >
                  Delete
                </button>
              </div>
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
  const loaded = useLiveQuery(async () => {
    try {
      return {
        book: validateNotebook(
          (await db.notebooks.get("main")) ?? emptyNotebook(),
        ),
        error: "",
      };
    } catch (e) {
      return { book: null, error: errorMessage(e) };
    }
  }, []);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [fundFilter, setFundFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(
    matchMedia("(display-mode: standalone)").matches,
  );
  const {
    offlineReady: [offlineReady],
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
    const network = () => setOnline(navigator.onLine);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const didInstall = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", didInstall);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", didInstall);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
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
        <h1>Your notebook couldn’t open</h1>
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
  if (!book.initialized) return <Setup />;
  const balances = totals(book);
  const sorted = [...book.entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
  const activeFunds = book.funds.filter((f) => !f.archived);
  const editEntry = (entry: Entry) =>
    setModal({ type: "entry", kind: entry.kind, entry });
  async function removeEntry(entry: Entry) {
    if (
      !confirm(
        `Delete this ${labels[entry.kind].toLowerCase()} of ${money(entry.amount)}? Your balances will be recalculated.`,
      )
    )
      return;
    try {
      if (await commit((current) => withoutEntry(current, entry.id)))
        setToast("Entry deleted. Balances updated.");
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
      onClick={() => setModal({ type: "entry", kind })}
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
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const thisWeek = book.entries.filter(
    (e) => e.date >= localDate(weekStart) && e.date <= localDate(),
  );
  const weekReceived = thisWeek
    .filter((e) => e.kind === "allowance")
    .reduce((sum, e) => sum + e.amount, 0);
  const weekSpent = thisWeek
    .filter((e) => e.kind === "expense" || e.kind === "spend")
    .reduce((sum, e) => sum + e.amount, 0);
  const weekSaved = thisWeek
    .filter((e) => e.kind === "deposit")
    .reduce((sum, e) => sum + e.amount, 0);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Pomi home">
          <span className="brand-mark">
            <Sprout size={26} />
          </span>
          pomi<span className="brand-dot">.</span>
        </a>
        <p className="brand-caption">MY MONEY NOTEBOOK</p>
        <nav aria-label="Main navigation">
          {pages.map(({ id, label, icon: Icon }) => (
            <a
              href={`#${id}`}
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
              {page === id && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={24} />
          <p>
            Little by little
            <br />
            adds up to a lot.
          </p>
          <span>Make room for what matters.</span>
        </div>
        <div className="storage-note">
          <span className="status-dot" />
          Saved on this device
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <NotebookPen size={16} />A little more mindful, every day.
          </span>
          <div>
            <span className="connection">
              {!online ? (
                <>
                  <WifiOff size={15} />
                  Offline
                </>
              ) : (
                <>
                  <span className="status-dot" />
                  {offlineReady ? "Ready for offline" : "My personal notebook"}
                </>
              )}
            </span>
            <span className="avatar" aria-label="My notebook">
              P
            </span>
          </div>
        </header>
        <main className="main-content" id="main-content">
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
          {page === "home" && (
            <>
              <header className="page-heading home-heading">
                <div>
                  <span className="eyebrow">A LITTLE CHECK-IN</span>
                  <h1>
                    My money, at a glance<span>.</span>
                  </h1>
                  <p>
                    Small notes today. A little more peace of mind tomorrow.
                  </p>
                </div>
                <span className="today-label">
                  {new Date().toLocaleDateString("en-PH", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </header>
              <div className="balance-grid">
                <section className="allowance-card">
                  <div className="balance-label">
                    <span>
                      <Wallet size={18} />
                      Available allowance
                    </span>
                    <span className="badge">YOURS TO USE</span>
                  </div>
                  <div className="hero-balance">
                    {money(balances.allowance)}
                  </div>
                  <p>Your everyday money, carried forward.</p>
                  <div className="balance-actions">
                    {entryButton("allowance", "Add allowance", "button light")}
                    {entryButton("expense", "Add expense", "button glass")}
                  </div>
                  <div className="card-decoration" aria-hidden="true">
                    <Leaf />
                  </div>
                </section>
                <section className="savings-summary">
                  <div className="balance-label">
                    <span>
                      <Sprout size={18} />
                      Tucked away
                    </span>
                    <Sun className="sun-icon" size={24} aria-hidden="true" />
                  </div>
                  <div className="hero-balance">{money(balances.savings)}</div>
                  <p>
                    Across {book.funds.length} savings{" "}
                    {book.funds.length === 1 ? "fund" : "funds"}, including
                    archived funds.
                  </p>
                  <a href="#savings">
                    A little closer to your goals
                    <ArrowUpRight size={18} />
                  </a>
                </section>
              </div>
              <section className="week-strip" aria-label="This week’s activity">
                <div>
                  <span className="eyebrow">THIS WEEK</span>
                  <span className="week-caption">One note at a time.</span>
                </div>
                <div>
                  <span>
                    <ArrowDownLeft size={15} />
                    Received
                  </span>
                  <strong>{money(weekReceived)}</strong>
                </div>
                <div>
                  <span>
                    <ArrowUpRight size={15} />
                    Spent
                  </span>
                  <strong>{money(weekSpent)}</strong>
                </div>
                <div>
                  <span>
                    <Sprout size={15} />
                    Put aside
                  </span>
                  <strong>{money(weekSaved)}</strong>
                </div>
              </section>
              <section className="section-block">
                <div className="section-title">
                  <div>
                    <h2>Growing little by little</h2>
                    <p>A place for the things you’re saving for.</p>
                  </div>
                  <a href="#savings">
                    All funds
                    <ChevronRight size={16} />
                  </a>
                </div>
                <div className="fund-grid home-funds">
                  {activeFunds.slice(0, 2).map((f) => renderFund(f, true))}
                  <button
                    className="new-fund-card"
                    onClick={() => setModal({ type: "fund" })}
                  >
                    <span>
                      <Plus size={22} />
                    </span>
                    <strong>A new little goal</strong>
                    <p>Give your next plan a place to grow.</p>
                  </button>
                </div>
              </section>
              <section className="panel recent-panel">
                <div className="section-title">
                  <div>
                    <h2>Recent notes</h2>
                    <p>The little ins and outs.</p>
                  </div>
                  <a href="#history">
                    View history
                    <ChevronRight size={16} />
                  </a>
                </div>
                <EntryList
                  entries={sorted.slice(0, 5)}
                  book={book}
                  edit={editEntry}
                  remove={removeEntry}
                />
              </section>
              <p className="bottom-note">
                <Leaf size={14} />
                Progress doesn’t have to be big to count.
              </p>
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
          <footer className="page-footer">
            <span>
              pomi. <span>A little notebook for your money.</span>
            </span>
            <span>
              Made for your own pace <Leaf size={13} />
            </span>
          </footer>
        </main>
      </div>
      {modal?.type === "entry" && (
        <EntryEditor
          key={modal.entry?.id ?? `${modal.kind}-${modal.fundId ?? ""}`}
          state={modal}
          book={book}
          close={() => setModal(null)}
          saved={setToast}
        />
      )}
      {modal?.type === "fund" && (
        <FundEditor
          fund={modal.fund}
          close={() => setModal(null)}
          saved={setToast}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
