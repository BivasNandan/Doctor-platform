/**
 * Pill-style tab bar. Pass `children` for trailing actions (e.g. a sign-out button).
 * @param {{tabs: {key: string, label: string}[], value: string, onChange: (key: string) => void, label?: string}} props
 */
export default function Tabs({ tabs, value, onChange, label = "Sections", children }) {
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
