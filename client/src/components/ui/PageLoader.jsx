/** Centered loading indicator for whole pages. */
export default function PageLoader({ label = "Loading…" }) {
  return (
    <div className="page-loader" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
