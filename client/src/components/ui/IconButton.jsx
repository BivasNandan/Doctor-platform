/** Square icon-only button. `label` is required for accessibility. */
export default function IconButton({ children, label, className = "", type = "button", ...props }) {
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
