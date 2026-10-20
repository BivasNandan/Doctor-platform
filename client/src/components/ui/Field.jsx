/**
 * Label + control + hint + inline error. The control is passed as children so
 * any <input>, <select> or <textarea> can be used.
 */
export default function Field({ label, hint, error, className, children }) {
  return (
    <label className={["field", className].filter(Boolean).join(" ")}>
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
