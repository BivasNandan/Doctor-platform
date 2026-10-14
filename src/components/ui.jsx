import { Sparkles } from "lucide-react";

export function IconButton({ children, label, ...props }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Button({ children, variant = "primary", ...props }) {
  return (
    <button className={`button button-${variant}`} {...props}>
      {children}
    </button>
  );
}

export function Pill({ children, tone = "neutral" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
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
export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Sparkles size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
