import { weeklySavings } from "./weekly-savings";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Circle,
  CircleCheck,
  ChevronRight,
  Minus,
  MoreHorizontal,
} from "lucide-react";
import {
  dayStatus,
  money,
  localDate,
  type AllowancePeriod,
  type Notebook,
} from "./model";

export function ActionMenu({
  label,
  children,
  className = "",
  trigger,
  floating = false,
  openOnHover = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  trigger?: ReactNode;
  floating?: boolean;
  openOnHover?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openedByHover = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  function cancelHoverClose() {
    clearTimeout(hoverTimer.current);
  }
  function hoverEnter(event: React.PointerEvent) {
    cancelHoverClose();
    if (openOnHover && event.pointerType === "mouse" && ref.current) {
      openedByHover.current = !ref.current.open;
      ref.current.open = true;
    }
  }
  function hoverLeave() {
    if (!openOnHover) return;
    cancelHoverClose();
    hoverTimer.current = setTimeout(() => {
      if (ref.current && !ref.current.contains(document.activeElement))
        ref.current.open = false;
    }, 180);
  }
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  function position() {
    if (!floating || !ref.current || !panelRef.current) return;
    const panel = panelRef.current;
    if (!ref.current.open) {
      panel.hidePopover();
      return;
    }
    Object.assign(panel.style, {
      position: "fixed",
      margin: "0",
      right: "auto",
      bottom: "auto",
      width: `${Math.min(240, innerWidth - 32)}px`,
    });
    if (!panel.matches(":popover-open")) panel.showPopover();
    const trigger = ref.current
      .querySelector("summary")!
      .getBoundingClientRect();
    const below = innerHeight - trigger.bottom - 16;
    const above = trigger.top - 16;
    const upward = below < panel.scrollHeight && above > below;
    panel.style.maxHeight = `${Math.max(80, Math.min(400, upward ? above : below))}px`;
    panel.style.left = `${Math.max(16, Math.min(trigger.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 16))}px`;
    panel.style.top = `${upward ? Math.max(16, trigger.top - panel.offsetHeight - 8) : trigger.bottom + 8}px`;
  }
  useEffect(() => {
    function close(event: PointerEvent | KeyboardEvent) {
      const node = ref.current;
      if (!node?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        node.open = false;
        node.querySelector("summary")?.focus();
      } else if (!node.contains(event.target as Node)) node.open = false;
    }
    function reposition() {
      if (ref.current?.open) position();
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close, true);
    if (floating) {
      window.addEventListener("resize", reposition);
      window.addEventListener("scroll", reposition, true);
    }
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [floating]);
  return (
    <details
      ref={ref}
      onPointerEnter={hoverEnter}
      onPointerLeave={hoverLeave}
      className={`action-menu ${className}`}
      onToggle={(event) => {
        if (event.target === event.currentTarget) position();
      }}
    >
      <summary
        aria-label={label}
        aria-controls={panelId}
        onClick={(event) => {
          if (openOnHover && openedByHover.current && ref.current?.open)
            event.preventDefault();
          openedByHover.current = false;
        }}
      >
        {trigger ?? <MoreHorizontal size={20} aria-hidden="true" />}
      </summary>
      <div
        id={panelId}
        ref={panelRef}
        onPointerEnter={cancelHoverClose}
        onPointerLeave={hoverLeave}
        popover={floating ? "manual" : undefined}
        className="action-popover"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button:not(:disabled)")) {
            // Return focus before the action opens a dialog, so its close restores here.
            ref.current?.querySelector("summary")?.focus();
            if (ref.current) ref.current.open = false;
          }
        }}
        onClickCapture={() => ref.current?.querySelector("summary")?.focus()}
      >
        {children}
      </div>
    </details>
  );
}

export function SchoolWeekdays({
  value,
  name = "schoolDays",
}: {
  value: number[];
  name?: string;
}) {
  return (
    <fieldset className="school-weekdays">
      <legend>School days</legend>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
        <label key={day}>
          <input
            type="checkbox"
            name={name}
            value={index}
            defaultChecked={value.includes(index)}
          />
          {day}
        </label>
      ))}
    </fieldset>
  );
}

export function Progress({
  label,
  completed,
  total,
}: {
  label: string;
  completed: number;
  total: number;
}) {
  return (
    <div className="completion-progress">
      <div className="goal-caption">
        <span>{label}</span>
        <span>
          {total ? `${completed} of ${total}` : "No scheduled school days"}
        </span>
      </div>
      {total > 0 && (
        <progress aria-label={label} max={total} value={completed} />
      )}
    </div>
  );
}

export function CheckInLink({
  book,
  period,
  openDay,
}: {
  book: Notebook;
  period?: AllowancePeriod;
  openDay(day: number): void;
}) {
  const [today, setToday] = useState(() => localDate());
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const { days } = weeklySavings(book, period, today);
  const currentDay =
    days.find((day) => day.date === today) ??
    days.find((day) => !day.noClass && day.status !== "Savings Completed") ??
    days[0];
  return (
    <a
      className="button primary daily-checkin-link weekly-checkin"
      href="#allowance"
      onClick={() => {
        if (currentDay) openDay(currentDay.dayNumber);
      }}
    >
      <CircleCheck size={18} aria-hidden="true" />
      {period ? "Open daily check-in" : "Set up daily check-in"}
      <ChevronRight size={16} aria-hidden="true" />
    </a>
  );
}

export function WeeklySavings({
  book,
  period,
  openDay,
  compact = false,
}: {
  book: Notebook;
  period?: AllowancePeriod;
  compact?: boolean;
  openDay(dayNumber: number): void;
}) {
  const [today, setToday] = useState(() => localDate());
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const { days, saved, target, remaining, eligible, completed } = weeklySavings(
    book,
    period,
    today,
  );
  return (
    <section className="weekly-savings" aria-label="Weekly savings progress">
      <div className="weekly-heading">
        <h2>{compact ? "This week" : "Your weekly savings"}</h2>
        {days.length > 0 && (
          <span>
            {eligible ? `${completed} of ${eligible} days` : "No school days"}
          </span>
        )}
      </div>
      {days.length > 0 ? (
        <>
          <div
            className="weekly-school-days"
            aria-label="Scheduled school days this week"
          >
            {days.map((day) => {
              const date = new Date(`${day.date}T12:00:00`);
              const name = date.toLocaleDateString("en-PH", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const status =
                day.status === "Not Recorded" && day.date! > today
                  ? "Upcoming"
                  : day.status;
              return (
                <a
                  key={day.dayNumber}
                  href="#allowance"
                  onClick={() => openDay(day.dayNumber)}
                  className={`weekly-school-day ${day.status === "Savings Completed" ? "completed" : ""}`}
                  aria-label={`${name}: ${status}`}
                  title={`${name}: ${status}`}
                >
                  <span className="weekly-day-mark">
                    {day.status === "Savings Completed" ? (
                      <Check size={18} aria-hidden="true" />
                    ) : compact ? (
                      <Circle size={14} aria-hidden="true" />
                    ) : (
                      <Minus size={18} aria-hidden="true" />
                    )}
                  </span>
                  <time dateTime={day.date}>
                    {date
                      .toLocaleDateString("en-PH", { weekday: "short" })
                      .slice(0, compact ? 3 : 1)}
                  </time>
                  {day.noClass && <small>No Class</small>}
                </a>
              );
            })}
          </div>
          {compact ? (
            eligible > 0 && (
              <progress
                className="weekly-money-progress"
                aria-label="Completed savings days this week"
                value={completed}
                max={eligible}
              />
            )
          ) : target > 0 ? (
            <>
              <progress
                className="weekly-money-progress"
                aria-label="Weekly daily savings target"
                aria-valuetext={`${money(saved)} saved of ${money(target)}`}
                value={Math.min(saved, target)}
                max={target}
              />
              <p className="weekly-target-copy">
                {money(saved)} saved this week ·{" "}
                {remaining > 0
                  ? `${money(remaining)} more to reach ${money(target)}`
                  : `Weekly target reached (${money(target)})`}
              </p>
            </>
          ) : !eligible ? (
            <p className="weekly-target-copy">
              All school days this week are marked No Class.
            </p>
          ) : (
            <p className="weekly-target-copy">
              No daily savings target set.{" "}
              <a href="#savings">Set up a fixed daily fund</a>
            </p>
          )}
        </>
      ) : (
        <p className="weekly-empty">
          {period
            ? "No scheduled school days this week. View your period in Allowance."
            : "Add an allowance period to start your weekly savings tracker."}
        </p>
      )}
    </section>
  );
}

export function SavingsReminder({
  book,
  period,
}: {
  book: Notebook;
  period?: AllowancePeriod;
}) {
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("pomi-reminder-dismissed") ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const today = localDate(now);
  const index = period?.days.findIndex((day) => day.date === today) ?? -1;
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (
    !book.preferences.reminderEnabled ||
    clock < book.preferences.reminderTime ||
    dismissed === today ||
    !period ||
    index < 0 ||
    period.days[index].noClass
  )
    return null;
  const day = period.days[index];
  const requirements =
    day.requiredFunds ??
    book.funds
      .filter((f) => !f.archived && f.savingMode === "fixed" && f.dailyAmount)
      .map((f) => f.id);
  if (
    !requirements.length ||
    dayStatus(book, period, index) === "Savings Completed"
  )
    return null;
  return (
    <aside className="savings-reminder" aria-label="Savings reminder">
      <div>
        <strong>Time to put a little aside</strong>
        <p>Your school day still has savings to record.</p>
      </div>
      <a className="button secondary" href="#allowance">
        Daily check-in
      </a>
      <button
        className="button quiet"
        onClick={() => {
          setDismissed(today);
          try {
            localStorage.setItem("pomi-reminder-dismissed", today);
          } catch {
            /* Session dismissal still works. */
          }
        }}
      >
        Dismiss today
      </button>
    </aside>
  );
}
