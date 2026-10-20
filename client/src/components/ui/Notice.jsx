/** Inline feedback. `error` announces assertively; otherwise it is a polite status. */
export default function Notice({ children, error = false }) {
  if (!children) return null;
  return (
    <p role={error ? "alert" : "status"} className={error ? "form-error" : "privacy-note"}>
      {children}
    </p>
  );
}
