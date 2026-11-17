import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown } from "lucide-react";

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size" | "value" | "defaultValue"
> & {
  value?: string;
  defaultValue?: string;
  renderLabel?: (value: string, label: ReactNode) => ReactNode;
};

type Option = { value: string; label: ReactNode; disabled?: boolean };
function words(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? words(child.props.children)
        : String(child),
    )
    .join("");
}

/** A single-select combobox; its native counterpart owns FormData and validity. */
export function Select({
  children,
  id,
  value,
  defaultValue,
  onChange,
  onInvalid,
  renderLabel,
  ...props
}: SelectProps) {
  const generated = useId();
  const triggerId = id ?? generated;
  const listId = `${triggerId}-options`;
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(String(defaultValue ?? ""));
  const [active, setActive] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const search = useRef({ text: "", at: 0 });
  const options: Option[] = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const option = child as React.ReactElement<{
        value?: string;
        children?: ReactNode;
        disabled?: boolean;
      }>;
      return {
        value: String(option.props.value ?? words(option.props.children)),
        label: option.props.children,
        disabled: option.props.disabled,
      };
    });
  const selected = String(value ?? internal);
  const selectedIndex = options.findIndex(
    (option) => option.value === selected,
  );
  const disabled = props.disabled;
  function close() {
    setOpen(false);
    search.current = { text: "", at: 0 };
  }
  function choose(index: number) {
    const option = options[index];
    if (
      !option ||
      option.disabled ||
      !native.current ||
      native.current.matches(":disabled")
    )
      return;
    native.current.value = option.value;
    setInternal(option.value);
    setInvalid(false);
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  }
  function show() {
    if (trigger.current?.matches(":disabled")) return;
    setActive(
      selectedIndex >= 0 && !options[selectedIndex].disabled
        ? selectedIndex
        : Math.max(
            0,
            options.findIndex((option) => !option.disabled),
          ),
    );
    setOpen(true);
  }
  useEffect(() => {
    if (!open) return;
    const panel = popup.current!;
    function position() {
      const rect = trigger.current!.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const up = below < 200 && above > below;
      Object.assign(panel.style, {
        width: `${Math.min(rect.width, innerWidth - 32)}px`,
        left: `${Math.max(16, Math.min(rect.left, innerWidth - rect.width - 16))}px`,
        maxHeight: `${Math.max(80, Math.min(320, up ? above : below))}px`,
        top: up ? "auto" : `${rect.bottom + 8}px`,
        bottom: up ? `${innerHeight - rect.top + 8}px` : "auto",
      });
    }
    position();
    panel.showPopover();
    function outside(event: PointerEvent) {
      if (
        !panel.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close();
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      panel.hidePopover();
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  return (
    <div className="select-control">
      <select
        {...props}
        id={`${triggerId}-native`}
        className="select-native"
        ref={native}
        tabIndex={-1}
        aria-hidden="true"
        value={selected}
        onChange={(event) => {
          setInternal(event.target.value);
          setInvalid(false);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
          onInvalid?.(event);
        }}
      >
        {children}
      </select>
      <button
        type="button"
        ref={trigger}
        id={triggerId}
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        aria-required={props.required || undefined}
        aria-invalid={invalid || props["aria-invalid"]}
        aria-describedby={
          [props["aria-describedby"], invalid ? `${triggerId}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onBlur={() => close()}
        onKeyDown={(event) => {
          const enabled = options
            .map((option, index) => (!option.disabled ? index : -1))
            .filter((index) => index >= 0);
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!open) {
              show();
              if (event.key === "Home") setActive(enabled[0] ?? 0);
              if (event.key === "End") setActive(enabled.at(-1) ?? 0);
              return;
            }
            const position = enabled.indexOf(active);
            setActive(
              event.key === "Home"
                ? (enabled[0] ?? 0)
                : event.key === "End"
                  ? (enabled.at(-1) ?? 0)
                  : (enabled[
                      Math.max(
                        0,
                        Math.min(
                          enabled.length - 1,
                          position + (event.key === "ArrowDown" ? 1 : -1),
                        ),
                      )
                    ] ?? 0),
            );
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open ? choose(active) : show();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
          } else if (event.key === "Tab" && open) {
            choose(active);
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            const now = Date.now();
            search.current.text =
              now - search.current.at > 700
                ? event.key
                : search.current.text + event.key;
            search.current.at = now;
            const typed = search.current.text.toLocaleLowerCase();
            const repeated = [...typed].every((letter) => letter === typed[0]);
            const query = repeated ? typed[0] : typed;
            const order = options.map((_, index) => index);
            const start = repeated && open ? active + 1 : 0;
            const match = [
              ...order.slice(start),
              ...order.slice(0, start),
            ].find(
              (index) =>
                !options[index].disabled &&
                words(options[index].label)
                  .toLocaleLowerCase()
                  .startsWith(query),
            );
            if (!open) show();
            if (match !== undefined) setActive(match);
          }
        }}
      >
        <span>
          {options[selectedIndex]
            ? (renderLabel?.(selected, options[selectedIndex].label) ??
              options[selectedIndex].label)
            : "Choose an option"}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={listId}
        popover="manual"
        className="select-options"
        role="listbox"
        aria-labelledby={triggerId}
        onPointerDown={(event) => event.preventDefault()}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={option.value === selected}
            aria-disabled={option.disabled || undefined}
            className={index === active ? "active-option" : ""}
            onPointerMove={() => {
              if (!option.disabled) setActive(index);
            }}
            onClick={() => choose(index)}
          >
            <span>
              {renderLabel?.(option.value, option.label) ?? option.label}
            </span>
            {option.value === selected && (
              <Check size={16} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
      {invalid && (
        <p id={`${triggerId}-error`} className="field-error" role="alert">
          Choose an option to continue.
        </p>
      )}
    </div>
  );
}
