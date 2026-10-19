import { Search, Sparkles, TriangleAlert } from "lucide-react";
import { Component, useRef } from "react";
import { statusTone } from "../constants.js";
import { useModalBehavior } from "../hooks.js";
import { avatarPlaceholder, capitalize, facilityPlaceholder } from "../utils.js";

// ─── Button ────────────────────────────────────────────────────────────────────────────────

/**
 * @param {{variant?: 'primary'|'outline'|'light', type?: 'button'|'submit'|'reset'}} props
 */
export function Button({ children, variant = "primary", className = "", type = "button", ...props }) {
  return (
    <button type={type} className={`button button-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

// ─── IconButton ────────────────────────────────────────────────────────────────────────────

/** Square icon-only button. `label` is required for accessibility. */
export function IconButton({ children, label, className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Pill ──────────────────────────────────────────────────────────────────────────────────

/** @param {{tone?: 'neutral'|'verified'|'available'|'pending'|'error'|'rating'}} props */
export function Pill({ children, tone = "neutral", className = "" }) {
  return <span className={`pill pill-${tone} ${className}`.trim()}>{children}</span>;
}

// ─── StatusPill ────────────────────────────────────────────────────────────────────────────

/** Pill coloured by a domain status ("pending", "accepted", "suspended"…). */
export function StatusPill({ status, label }) {
  return <Pill tone={statusTone(status)}>{label ?? capitalize(status ?? "unknown")}</Pill>;
}

// ─── SectionHeading ────────────────────────────────────────────────────────────────────────

/** Page title block: eyebrow, h1, optional description and right-aligned action. */
export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────────────────

export function EmptyState({ title, description, action, icon: Icon = Sparkles }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────────────────

/** Person photo with a generated initials fallback. Inherits sizing from the parent's CSS. */
export function Avatar({ src, name, alt = "", ...props }) {
  return <img src={src || avatarPlaceholder(name)} alt={alt} loading="lazy" {...props} />;
}

/** Clinic photo with a neutral building fallback. */
export function FacilityImage({ src, alt = "", ...props }) {
  return <img src={src || facilityPlaceholder()} alt={alt} loading="lazy" {...props} />;
}

// ─── Field ─────────────────────────────────────────────────────────────────────────────────

/**
 * Label + control + hint + inline error. The control is passed as children so
 * any <input>, <select> or <textarea> can be used.
 */
export function Field({ label, hint, error, className, children }) {
  return (
    <label className={className}>
      {label}
      {children}
      {hint && <small className="field-hint">{hint}</small>}
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

// ─── CheckboxGroup ─────────────────────────────────────────────────────────────────────────

/** Group of checkboxes sharing one `name` (read with FormData.getAll). */
export function CheckboxGroup({ legend, name, options, defaultValue = [], disabled, error }) {
  return (
    <fieldset className="check-group" disabled={disabled}>
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} className="check-option">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValue.includes(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}

// ─── Notice ────────────────────────────────────────────────────────────────────────────────

/** Inline feedback. `error` announces assertively; otherwise it is a polite status. */
export function Notice({ children, error = false }) {
  if (!children) return null;
  return (
    <p role={error ? "alert" : "status"} className={error ? "form-error" : "privacy-note"}>
      {children}
    </p>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────────────────

/**
 * Pill-style tab bar. Pass `children` for trailing actions (e.g. a sign-out button).
 * @param {{tabs: {key: string, label: string}[], value: string, onChange: (key: string) => void, label?: string}} props
 */
export function Tabs({ tabs, value, onChange, label = "Sections", children }) {
  return (
    <div className="appointment-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          className={value === tab.key ? "active" : ""}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
      {children}
    </div>
  );
}

// ─── DataTable ─────────────────────────────────────────────────────────────────────────────

/**
 * Responsive table with an empty state.
 * @param {{
 *   columns: {key: string, header: string, render: (row: any) => import('react').ReactNode}[],
 *   rows: any[],
 *   getRowKey: (row: any) => string,
 *   emptyMessage?: string,
 *   bare?: boolean,
 * }} props `bare` drops the surrounding card (when already inside one).
 */
export function DataTable({ columns, rows, getRowKey, emptyMessage = "Nothing to show.", bare = false }) {
  return (
    <div className={bare ? "table-wrap" : "table-wrap surface"}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="table-empty">{emptyMessage}</div>}
    </div>
  );
}

// ─── ListToolbar ───────────────────────────────────────────────────────────────────────────

/** Search box with a result counter, shown above admin lists and tables. */
export function ListToolbar({ placeholder, value, onChange, count, noun }) {
  return (
    <div className="table-toolbar surface">
      <div>
        <Search size={16} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <Pill>
        {count} {noun}
      </Pill>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────────────────

/** Placeholder cards shown while a grid of results loads. */
export function SkeletonGrid({ count = 3 }) {
  return (
    <div className="skeleton-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <i />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

/** Centered loading indicator for whole pages. */
export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="page-loader" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

// ─── ErrorState ────────────────────────────────────────────────────────────────────────────

/** Shown when loading a screen's data failed. Offers a retry. */
export function ErrorState({ error, onRetry, title = "We couldn’t load this" }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={error?.message || "Something went wrong. Please try again."}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────────────────

/**
 * Accessible modal dialog: scrim click and Escape close it, focus moves in,
 * is trapped while open and returns to the trigger afterwards.
 * `as` lets the dialog itself be a <form>.
 */
export function Modal({ as: Tag = "div", labelledBy, onClose, className = "", children, ...props }) {
  const dialog = useRef(null);
  useModalBehavior(dialog, onClose);

  return (
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <Tag
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={className}
        {...props}
      >
        {children}
      </Tag>
    </div>
  );
}

// ─── ConfirmDialog ─────────────────────────────────────────────────────────────────────────

export function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  return (
    <Modal labelledBy="confirm-title" onClose={onCancel} className="confirm-dialog surface">
      <h2 id="confirm-title">{title}</h2>
      {message && <p>{message}</p>}
      <div className="form-actions">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ─── ErrorBoundary ─────────────────────────────────────────────────────────────────────────

/** Catches render errors so a bug in one screen does not blank the whole app. */
export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Hook for an error-reporting service (Sentry, etc.).
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="This screen hit an unexpected problem. Reload to try again."
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    );
  }
}
