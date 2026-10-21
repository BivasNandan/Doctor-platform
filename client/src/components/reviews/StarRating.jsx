import { Star } from "lucide-react";

/** Read-only stars, e.g. `<Stars value={4.5} />`. Exposed to screen readers as "4.5 out of 5 stars". */
export function Stars({ value, size = 15 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((point) => (
        <Star key={point} size={size} className={point <= Math.round(value) ? "star star-on" : "star"} />
      ))}
    </span>
  );
}

/** A row of five buttons to choose a rating from 1 to 5. */
export function StarPicker({ value, onChange, disabled = false }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((point) => (
        <button
          key={point}
          type="button"
          role="radio"
          aria-checked={value === point}
          aria-label={`${point} ${point === 1 ? "star" : "stars"}`}
          disabled={disabled}
          className="star-button"
          onClick={() => onChange(point)}
        >
          <Star size={26} className={point <= value ? "star star-on" : "star"} />
        </button>
      ))}
    </div>
  );
}
