import { ArrowUpRight, Heart, MapPin, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import DoctorFilters from "../../components/discovery/DoctorFilters.jsx";
import { SORT_OPTIONS } from "../../components/discovery/searchOptions.js";
import DoctorGrid from "../../components/doctors/DoctorGrid.jsx";
import { Button, ScrollReveal, SectionHeading } from "../../components/ui/index.js";
import { useBooking } from "../../context/BookingContext.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useFavorites } from "../../context/FavoritesContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useDoctorFilters } from "../../hooks/useDoctorFilters.js";
import { useResource } from "../../hooks/useResource.js";
import { doctorService } from "../../services/index.js";
import { PATHS } from "../../constants.js";

const SORTERS = {
  recommended: () => 0,
  "fee-low": (a, b) => a.fee - b.fee,
  experience: (a, b) => b.experienceYears - a.experienceYears,
};

export default function DirectoryPage() {
  const { openBooking } = useBooking();
  const { specialties } = useCatalog();
  const { doctorIds } = useFavorites();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const savedView = searchParams.get("view") === "saved";
  const { filters, setFilter, clearFilters } = useDoctorFilters();
  const [sort, setSort] = useState("recommended");

  // Typing updates the URL immediately; the request waits until typing pauses.
  const debouncedFilters = useDebouncedValue(filters, 250);
  // Language filtering is client-side because the current service contract has no language field.
  const serviceFilters = Object.fromEntries(
    Object.entries(debouncedFilters).filter(([key]) => !["language", "minExperience"].includes(key)),
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
    return data
      .filter(matchesLanguage)
      .filter((doctor) => !filters.minExperience || doctor.experienceYears >= Number(filters.minExperience))
      .filter((doctor) => !savedView || doctorIds.includes(doctor.id))
      .sort(SORTERS[sort]);
  }, [data, filters.language, filters.minExperience, sort, savedView, doctorIds]);
  const languages = useMemo(
    () =>
      [...new Set((data ?? []).flatMap((doctor) => doctor.languages ?? []))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [data],
  );

  return (
    <>
      <SectionHeading
        eyebrow={t(savedView ? "YOUR PERSONAL LIST" : "CARE, CLOSER TO YOU")}
        title={
          <>
            {savedView ? (
              <>
                {t("Saved")} <em>{t("doctors.")}</em>
              </>
            ) : (
              <>
                {t("Find your")} <em>{t("doctor.")}</em>
              </>
            )}
          </>
        }
        description={t(
          savedView
            ? "Doctors you’ve saved on this device."
            : "Meet trusted specialists and find a time that works for you.",
        )}
        action={
          <Link
            className="button button-outline"
            to={savedView ? PATHS.doctors : `${PATHS.doctors}?view=saved`}
          >
            <Heart size={15} /> {savedView ? t("Browse doctors") : `${t("Saved")} (${doctorIds.length})`}
          </Link>
        }
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
            placeholder={t("Doctor or specialty")}
            value={filters.query}
            onChange={(event) => setFilter("query", event.target.value)}
          />
          <MapPin size={18} />
          <input
            aria-label="Search location"
            placeholder={t("Area or city")}
            value={filters.location}
            onChange={(event) => setFilter("location", event.target.value)}
          />
          <Button type="submit">
            {t("Search doctors")} <ArrowUpRight size={15} />
          </Button>
        </form>
      </ScrollReveal>
      <ScrollReveal>
        <div className="directory-layout">
          <DoctorFilters
            filters={filters}
            specialties={specialties}
            languages={languages}
            setFilter={setFilter}
            onClear={clearFilters}
          />
          <div className="directory-results">
            <div className="results-toolbar">
              <span>
                <strong>{doctors?.length ?? 0}</strong> {t("doctors found")}{" "}
                <span className="location-crumb">
                  <MapPin size={13} /> {filters.location || t("All locations")}
                </span>
              </span>
              <label>
                {t("Sort by")}{" "}
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
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
              emptyTitle={savedView ? "No doctors saved yet" : "No matching doctors yet"}
              emptyDescription={
                savedView
                  ? "Save a doctor with the heart button and they’ll appear here."
                  : "Try widening your filters or clearing a few selections."
              }
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
