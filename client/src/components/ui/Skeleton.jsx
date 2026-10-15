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
