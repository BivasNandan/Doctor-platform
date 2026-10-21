import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import DoctorFilters from "../../components/discovery/DoctorFilters.jsx";
import { SORT_OPTIONS } from "../../components/discovery/searchOptions.js";
import DoctorGrid from "../../components/doctors/DoctorGrid.jsx";
import { Button, ScrollReveal, SectionHeading } from "../../components/ui/index.js";
import { useBooking } from "../../context/BookingContext.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useDoctorFilters } from "../../hooks/useDoctorFilters.js";
import { useResource } from "../../hooks/useResource.js";
import { doctorService } from "../../services/index.js";

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
  // Language filtering is client-side because the current service contract has no language field.
  const serviceFilters = Object.fromEntries(
    Object.entries(debouncedFilters).filter(([key]) => key !== "language"),
  );
  const requestKey = JSON.stringify(serviceFilters);
  const { data, loading, error, reload } = useResource(
    () => doctorService.list(JSON.parse(requestKey)),
    [requestKey],
  );
  const doctors = useMemo(() => {
    if (!data) return data;
    const matchesLanguage = (doctor) =>
      !filters.language ||
      doctor.languages?.some(
        (language) => language.toLocaleLowerCase() === filters.language.toLocaleLowerCase(),
      );
    return data.filter(matchesLanguage).sort(SORTERS[sort]);
  }, [data, filters.language, sort]);

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
