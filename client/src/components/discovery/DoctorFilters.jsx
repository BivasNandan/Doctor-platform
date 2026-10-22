import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { formatFee } from "../../utils/format.js";
import { AVAILABILITY_OPTIONS, FEE_RANGE } from "./searchOptions.js";

/**
 * Sidebar filters for the doctor directory.
 * @param {{filters: object, specialties: object[], setFilter: (key: string, value: unknown) => void, onClear: () => void}} props
 */
export default function DoctorFilters({ filters, specialties, languages = [], setFilter, onClear }) {
  const { t } = useLanguage();
  return (
    <aside className="filters-panel surface" aria-label="Filters">
      <div className="filter-head">
        <h3>
          <SlidersHorizontal size={17} /> {t("Filters")}
        </h3>
        <button type="button" onClick={onClear}>
          {t("Clear all")}
        </button>
      </div>
      <label className="filter-label">
        {t("Specialty")}
        <select
          aria-label={t("Specialty")}
          value={filters.specialty}
          onChange={(event) => setFilter("specialty", event.target.value)}
        >
          <option value="">{t("All specialties")}</option>
          {specialties.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-label">
        {t("Consultation fee")}
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
        {t("Experience")}
        <div className="range-copy">
          {t("At least")} <b>{filters.minExperience ? `${filters.minExperience} ${t("years")}` : t("Any")}</b>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          step="5"
          value={filters.minExperience || 0}
          onChange={(event) =>
            setFilter("minExperience", event.target.value === "0" ? "" : event.target.value)
          }
        />
      </label>
      {languages.length > 0 && (
        <label className="filter-label">
          {t("Language")}
          <select value={filters.language} onChange={(event) => setFilter("language", event.target.value)}>
            <option value="">{t("Any language")}</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="filter-label">
        {t("Availability")}
        <select value={filters.available} onChange={(event) => setFilter("available", event.target.value)}>
          <option value="">{t("Any time")}</option>
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
          <ShieldCheck size={15} /> {t("Platform verified")}
        </span>
      </label>
    </aside>
  );
}
