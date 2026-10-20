import { ArrowUpRight, MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, SectionHeading } from "../../components/ui.jsx";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import { useCatalog } from "../../context.jsx";
import { useDebouncedValue, useResource } from "../../hooks.js";
import { doctorService } from "../../services/index.js";
import { formatFee } from "../../utils.js";
import { useBooking } from "../booking/Booking.jsx";
import { DoctorGrid } from "./Cards.jsx";
import { AVAILABILITY_OPTIONS, FEE_RANGE, SORT_OPTIONS } from "./DiscoverPage.jsx";

// ─── DirectoryPage ─────────────────────────────────────────────────────────────────────────

const SORTERS = {
  recommended: () => 0,
  "fee-low": (a, b) => a.fee - b.fee,
  experience: (a, b) => b.experienceYears - a.experienceYears,
};

export default function DirectoryPage() {
  const { openBooking } = useBooking();
  const { specialties } = useCatalog();
  const { filters, setFilter, clearFilters } = useDoctorFilters();
  const [sort, setSort] = useState("recommended");

  // Typing updates the URL immediately; the request waits until typing pauses.
  const debouncedFilters = useDebouncedValue(filters, 250);
  const requestKey = JSON.stringify(debouncedFilters);
  const { data, loading, error, reload } = useResource(
    () => doctorService.list(JSON.parse(requestKey)),
    [requestKey],
  );
  const doctors = useMemo(() => (data ? [...data].sort(SORTERS[sort]) : data), [data, sort]);

  return (
    <>
      <SectionHeading
        eyebrow="CARE, CLOSER TO YOU"
        title={
          <>
            Find your <em>doctor.</em>
          </>
        }
        description="Meet trusted specialists and find a time that works for you."
      />
      <ScrollReveal>
        <form
          className="directory-search surface"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            reload();
          }}
        >
          <Search size={19} />
          <input
            aria-label="Search doctors"
            placeholder="Doctor or specialty"
            value={filters.query}
            onChange={(event) => setFilter("query", event.target.value)}
          />
          <MapPin size={18} />
          <input
            aria-label="Search location"
            placeholder="Area or city"
            value={filters.location}
            onChange={(event) => setFilter("location", event.target.value)}
          />
          <Button type="submit">
            Search doctors <ArrowUpRight size={15} />
          </Button>
        </form>
      </ScrollReveal>
      <ScrollReveal>
        <div className="directory-layout">
          <DoctorFilters
            filters={filters}
            specialties={specialties}
            setFilter={setFilter}
            onClear={clearFilters}
          />
          <div className="directory-results">
            <div className="results-toolbar">
              <span>
                <strong>{doctors?.length ?? 0}</strong> doctors found{" "}
                <span className="location-crumb">
                  <MapPin size={13} /> {filters.location || "All locations"}
                </span>
              </span>
              <label>
                Sort by{" "}
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <DoctorGrid
              doctors={doctors}
              loading={loading}
              error={error}
              onRetry={reload}
              onBook={openBooking}
              className="directory-grid"
              skeletons={4}
              emptyTitle="No matching doctors yet"
              emptyDescription="Try widening your filters or clearing a few selections."
              emptyAction={
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              }
            />
          </div>
        </div>
      </ScrollReveal>
    </>
  );
}

// ─── DoctorFilters ─────────────────────────────────────────────────────────────────────────

/**
 * Sidebar filters for the doctor directory.
 * @param {{filters: object, specialties: object[], setFilter: (key: string, value: unknown) => void, onClear: () => void}} props
 */
function DoctorFilters({ filters, specialties, setFilter, onClear }) {
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

// ─── useDoctorFilters ──────────────────────────────────────────────────────────────────────

/** Filters accepted by GET /doctors. They live in the URL so searches are shareable. */
export const DEFAULT_FILTERS = Object.freeze({
  query: "",
  specialty: "",
  location: "",
  maxFee: "",
  available: "",
  verified: false,
});

const isEmpty = (value) => value === "" || value === false || value == null;

/** Reads and updates the doctor-directory filters from the URL query string. */
export function useDoctorFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      query: params.get("query") ?? "",
      specialty: params.get("specialty") ?? "",
      location: params.get("location") ?? "",
      maxFee: params.get("maxFee") ?? "",
      available: params.get("available") ?? "",
      verified: params.get("verified") === "true",
    }),
    [params],
  );

  const setFilter = useCallback(
    (key, value) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (isEmpty(value)) next.delete(key);
          else next.set(key, String(value));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { filters, setFilter, clearFilters };
}
