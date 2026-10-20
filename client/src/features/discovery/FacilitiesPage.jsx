import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, PageLoader, SectionHeading } from "../../components/ui.jsx";
import ScrollReveal from "../../components/ScrollReveal.jsx";
import { doctorsSearchPath, PATHS } from "../../constants.js";
import { useCatalog } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { doctorService } from "../../services/index.js";
import { FacilityCard } from "./Cards.jsx";

const KINDS = [
  ["all", "Nearby"],
  ["hospital", "Hospitals"],
  ["clinic", "Clinics"],
];

export default function FacilitiesPage() {
  const navigate = useNavigate();
  const { facilities, loading, error, reload } = useCatalog();
  const { data: doctors = [] } = useResource(() => doctorService.list(), []);
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");

  const visible = facilities.filter(
    (facility) =>
      (kind === "all" || facility.type === kind) &&
      `${facility.name} ${facility.area}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <SectionHeading
        eyebrow="CARE AROUND YOUR CORNER"
        title={
          <>
            Find your place
            <br />
            for <em>care.</em>
          </>
        }
        description="Explore hospitals and clinics near you. Great care, a little closer."
      />
      <div className="facility-toolbar surface">
        <div className="facility-search">
          <Search size={17} />
          <input
            aria-label="Search by clinic or area"
            placeholder="Search by clinic or area"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <MapPin size={16} />
          <span>Dhaka</span>
        </div>
        <div className="segmented" role="group" aria-label="View">
          {["list", "map"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={view === mode ? "active" : ""}
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
            >
              {mode === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>
      <div className="discovery-switch">
        {KINDS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={kind === key ? "active" : ""}
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
          >
            {label}
          </button>
        ))}
        <span>Showing {visible.length} places</span>
      </div>
      <ScrollReveal>
        {loading && !facilities.length ? (
          <PageLoader />
        ) : error && !facilities.length ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <div className={`facility-grid ${view === "map" ? "facility-map-layout" : ""}`}>
            {visible.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                doctors={doctors.filter((doctor) => doctor.facilityIds.includes(facility.id))}
                onViewDoctors={() => navigate(doctorsSearchPath({ location: facility.name }))}
              />
            ))}
          </div>
        )}
      </ScrollReveal>
      {!loading && !error && visible.length === 0 && (
        <EmptyState
          title="No places found"
          description="Try a different neighborhood or category."
          action={
            <button className="text-link" type="button" onClick={() => navigate(PATHS.doctors)}>
              Browse all doctors
            </button>
          }
        />
      )}
    </>
  );
}
