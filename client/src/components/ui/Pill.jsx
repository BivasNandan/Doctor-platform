/** @param {{tone?: 'neutral'|'verified'|'available'|'pending'|'error'|'rating'}} props */
export default function Pill({ children, tone = "neutral", className = "" }) {
  return <span className={`pill pill-${tone} ${className}`.trim()}>{children}</span>;
}
