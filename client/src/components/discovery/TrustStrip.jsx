import { Sparkles } from "lucide-react";

export const TRUST_STATS = [
  { value: "Search", suffix: "", label: "by specialty and area" },
  { value: "Compare", suffix: "", label: "fees and clinic locations" },
  { value: "Request", suffix: "", label: "an appointment time" },
];

export default function TrustStrip() {
  return (
    <div className="trust-strip">
      <div>
        <span className="eyebrow">HERE FOR YOUR HEALTH</span>
        <strong className="trust-headline">
          Thoughtful care.
          <br />
          <em>Made more human.</em>
        </strong>
      </div>
      {TRUST_STATS.map((stat) => (
        <div className="trust-stat" key={stat.label}>
          <strong>
            {stat.value}
            <span>{stat.suffix}</span>
          </strong>
          <small>{stat.label}</small>
        </div>
      ))}
      <div className="trust-note">
        <Sparkles size={19} />
        <span>
          Because finding care
          <br />
          should feel like progress.
        </span>
      </div>
    </div>
  );
}
