import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { formatFee } from "../../utils/format.js";
import { AVAILABILITY_OPTIONS, FEE_RANGE } from "./searchOptions.js";

/**
 * Sidebar filters for the doctor directory.
 * @param {{filters: object, specialties: object[], setFilter: (key: string, value: unknown) => void, onClear: () => void}} props
 */
export default function DoctorFilters({ filters, specialties, setFilter, onClear }) {
  return (
    <aside className="filters-panel surface" aria-label="Filters">
      <div className="filter-head">
        <h3>
          <SlidersHorizontal size={17} /> Filters
        </h3>
        <button type="button" onClick={onClear}>
          Clear all
        </button>
      </div>
      <label className="filter-label">
        Specialty
        <select value={filters.specialty} onChange={(event) => setFilter("specialty", event.target.value)}>
          <option value="">All specialties</option>
          {specialties.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-label">
        Consultation fee
        <div className="range-copy">
          Up to <b>{filters.maxFee ? formatFee(filters.maxFee) : `${formatFee(FEE_RANGE.max)}+`}</b>
        </div>
        <input
          type="range"
          min={FEE_RANGE.min}
          max={FEE_RANGE.max}
          step={FEE_RANGE.step}
          value={filters.maxFee || FEE_RANGE.max}
          onChange={(event) =>
            setFilter("maxFee", Number(event.target.value) >= FEE_RANGE.max ? "" : event.target.value)
          }
        />
      </label>
      <label className="filter-label">
        Availability
        <select value={filters.available} onChange={(event) => setFilter("available", event.target.value)}>
          <option value="">Any time</option>
          {AVAILABILITY_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="filter-check">
        <input
          type="checkbox"
          checked={filters.verified}
          onChange={(event) => setFilter("verified", event.target.checked)}
        />
        <span>
          <ShieldCheck size={15} /> Platform verified
        </span>
      </label>
    </aside>
  );
}
