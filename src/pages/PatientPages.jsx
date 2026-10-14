import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { careService, serviceMode } from "../data/careService.js";
import DoctorCard from "../components/DoctorCard.jsx";
import {
  Button,
  EmptyState,
  Pill,
  SectionHeading,
} from "../components/ui.jsx";

function DiscoverPage({
  doctors,
  facilities,
  specialties,
  filters,
  updateFilter,
  onSearch,
  onBooking,
  onProfile,
  onRoute,
  loading,
}) {
  const [suggestions, setSuggestions] = useState(false);
  const topDoctors = doctors.slice(0, 3);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> CARE THAT MEETS YOU HERE
          </span>
          <h1>
            Good care starts
            <br />
            with{" "}
            <em>
              the right
              <br />
              connection.
            </em>
          </h1>
          <p>
            Meet trusted doctors who listen, understand, and help you feel your
            best — wherever you are in your health journey.
          </p>
          <div className="hero-proof">
            <div className="avatar-stack">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces"
                alt=""
              />
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces"
                alt=""
              />
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces"
                alt=""
              />
            </div>
            <span>
              <strong>
                ★★★★★ <b>4.9/5</b>
              </strong>
              <small>Loved by 12,000+ patients</small>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-wrap">
            <img
              className="hero-image"
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=85"
              alt="Doctor in a calm, welcoming clinic"
            />
            <div className="hero-image-overlay" />
            <div className="floating-note note-top">
              <span className="note-icon">
                <ShieldCheck size={18} />
              </span>
              <span>
                <strong>Care you can trust</strong>
                <small>Doctors, thoughtfully verified</small>
              </span>
              <span className="note-check">
                <Check size={15} />
              </span>
            </div>
            <div className="floating-note note-bottom">
              <img src={doctors[0]?.image} alt="" />
              <span>
                <strong>Dr. Arif Rahman</strong>
                <small>Cardiologist · 12 years</small>
              </span>
            </div>
            <span className="image-stamp">CW—01</span>
          </div>
          <div className="hero-caption">
            <span>
              <i /> A LITTLE MORE HUMAN, BY DESIGN
            </span>
            <span>01 / 03</span>
          </div>
        </div>
      </section>
      <section className="search-section">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">YOUR NEXT STEP</span>
            <h2>Find care that feels right.</h2>
          </div>
          <span className="search-aside">
            A good place to start <ArrowRight size={15} />
          </span>
        </div>
        <form className="search-panel surface" onSubmit={onSearch}>
          <label className="search-field">
            <Search size={19} />
            <span>
              <small>I’m looking for</small>
              <input
                value={filters.query}
                onChange={(e) => {
                  updateFilter("query", e.target.value);
                  setSuggestions(true);
                }}
                onFocus={() => setSuggestions(true)}
                placeholder="Doctor, specialty or clinic"
                aria-label="Doctor, specialty or clinic"
              />
            </span>
            {suggestions && filters.query && (
              <div className="suggestion-list">
                {specialties
                  .filter((item) =>
                    item.name
                      .toLowerCase()
                      .includes(filters.query.toLowerCase()),
                  )
                  .slice(0, 3)
                  .map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        updateFilter("specialty", item.id);
                        updateFilter("query", item.name);
                        setSuggestions(false);
                      }}
                    >
                      <Stethoscope size={15} />
                      {item.name}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
              </div>
            )}
          </label>
          <i className="search-divider" />
          <label className="search-field">
            <MapPin size={19} />
            <span>
              <small>Around</small>
              <input
                value={filters.location}
                onChange={(e) => updateFilter("location", e.target.value)}
                placeholder="Area, city or postcode"
                aria-label="Location"
              />
            </span>
            <ChevronDown size={15} />
          </label>
          <Button type="submit">
            Find my doctor <ArrowUpRight size={16} />
          </Button>
        </form>
        <div className="quick-search">
          <span>POPULAR:</span>
          {["Cardiology", "Dermatology", "Dentistry", "Pediatrics"].map(
            (specialty) => (
              <button
                key={specialty}
                onClick={() => {
                  updateFilter("query", specialty);
                  updateFilter(
                    "specialty",
                    {
                      Cardiology: "cardiology",
                      Dermatology: "dermatology",
                      Dentistry: "dentistry",
                      Pediatrics: "pediatrics",
                    }[specialty],
                  );
                  onSearch();
                }}
              >
                {specialty}
              </button>
            ),
          )}
        </div>
      </section>
      <div className="trust-strip">
        <div>
          <span className="eyebrow">HERE FOR YOUR HEALTH</span>
          <strong className="trust-headline">
            Thoughtful care.
            <br />
            <em>Made more human.</em>
          </strong>
        </div>
        <div className="trust-stat">
          <strong>
            250<span>+</span>
          </strong>
          <small>verified specialists</small>
        </div>
        <div className="trust-stat">
          <strong>
            18<span>k</span>
          </strong>
          <small>appointments made</small>
        </div>
        <div className="trust-stat">
          <strong>
            4.9<span>★</span>
          </strong>
          <small>patient experience</small>
        </div>
        <div className="trust-note">
          <Sparkles size={19} />
          <span>
            Because finding care
            <br />
            should feel like progress.
          </span>
        </div>
      </div>
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A GOOD PLACE TO BEGIN</span>
            <h2>
              Doctors patients <em>love.</em>
            </h2>
            <p>
              A few of the kind, skilled people making a difference in Dhaka.
            </p>
          </div>
          <button className="text-link" onClick={() => onRoute("doctors")}>
            Explore all doctors <ArrowUpRight size={15} />
          </button>
        </div>
        {loading ? (
          <div className="skeleton-grid">
            {[1, 2, 3].map((x) => (
              <div className="skeleton-card" key={x}>
                <i />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : topDoctors.length ? (
          <div className="doctor-grid">
            {topDoctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onBook={onBooking}
                onProfile={onProfile}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No doctors to show"
            description="Try searching for another specialty or location."
            action={
              <Button onClick={() => onRoute("doctors")}>
                Browse all doctors
              </Button>
            }
          />
        )}
        <div className="doctor-bottom">
          <span>
            <i /> Platform verified professionals
          </span>
          <button className="text-link" onClick={() => onRoute("doctors")}>
            See all 250+ specialists <ArrowRight size={15} />
          </button>
        </div>
      </section>
      <section className="care-banner">
        <div className="banner-sparkle">
          <Sparkles size={26} />
        </div>
        <div>
          <span className="eyebrow">YOUR HEALTH, YOUR PACE</span>
          <h2>
            Care should feel
            <br />
            <em>like a conversation.</em>
          </h2>
          <p>
            No guesswork. No rushed decisions. Just thoughtful people, clear
            next steps, and care built around you.
          </p>
          <Button variant="light" onClick={() => onRoute("doctors")}>
            Let’s find your doctor <ArrowUpRight size={16} />
          </Button>
        </div>
        <div className="banner-side">
          GOOD CARE IS
          <br />
          ALWAYS PERSONAL.
          <i />
          CAREWELL · DHAKA
          <br />
          EST. FOR YOU
        </div>
      </section>
      <section className="community-quote">
        <span className="eyebrow">KIND WORDS, REAL PEOPLE</span>
        <h2>
          Feeling better starts
          <br />
          with <em>feeling heard.</em>
        </h2>
        <blockquote>
          “For the first time, finding a doctor felt simple. I booked in a few
          minutes and Dr. Nusrat made me feel completely at ease.”
        </blockquote>
        <div className="quote-author">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces"
            alt=""
          />
          <span>
            <strong>Demo patient</strong>
            <small>Carewell patient · Dhaka</small>
          </span>
          <b>★★★★★</b>
        </div>
      </section>
    </>
  );
}

function DirectoryPage({
  doctors,
  specialties,
  filters,
  updateFilter,
  onSearch,
  onClear,
  onBooking,
  onProfile,
  loading,
  sort,
  setSort,
}) {
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
      <form className="directory-search surface" onSubmit={onSearch}>
        <Search size={19} />
        <input
          aria-label="Search doctors"
          placeholder="Doctor or specialty"
          value={filters.query}
          onChange={(e) => updateFilter("query", e.target.value)}
        />
        <MapPin size={18} />
        <input
          aria-label="Search location"
          placeholder="Area or city"
          value={filters.location}
          onChange={(e) => updateFilter("location", e.target.value)}
        />
        <Button>
          Search doctors <ArrowUpRight size={15} />
        </Button>
      </form>
      <div className="directory-layout">
        <aside className="filters-panel surface">
          <div className="filter-head">
            <h3>
              <SlidersHorizontal size={17} /> Filters
            </h3>
            <button onClick={onClear}>Clear all</button>
          </div>
          <label className="filter-label">
            Specialty
            <select
              value={filters.specialty}
              onChange={(e) => updateFilter("specialty", e.target.value)}
            >
              <option value="">All specialties</option>
              {specialties.filter((item) => item.active !== false).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            Consultation fee
            <div className="range-copy">
              Up to <b>৳{filters.maxFee || "3,000"}+</b>
            </div>
            <input
              type="range"
              min="500"
              max="3000"
              step="100"
              value={filters.maxFee || 3000}
              onChange={(e) => updateFilter("maxFee", e.target.value)}
            />
          </label>
          <label className="filter-label">
            Language
            <select
              value={filters.language}
              onChange={(e) => updateFilter("language", e.target.value)}
            >
              <option value="">Any language</option>
              <option>Bangla</option>
              <option>English</option>
            </select>
          </label>
          <label className="filter-label">
            Availability
            <select
              value={filters.available}
              onChange={(e) => updateFilter("available", e.target.value)}
            >
              <option value="">Any time</option>
              <option>Today</option>
              <option>Tomorrow</option>
              <option>This week</option>
            </select>
          </label>
          <label className="filter-check">
            <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => updateFilter("verified", e.target.checked)}
            />
            <span>
              <ShieldCheck size={15} /> Platform verified
            </span>
          </label>
          <Button className="full-button" onClick={onSearch}>
            Apply filters <ArrowRight size={15} />
          </Button>
        </aside>
        <div className="directory-results">
          <div className="results-toolbar">
            <span>
              <strong>{doctors.length}</strong> doctors found{" "}
              <span className="location-crumb">
                <MapPin size={13} /> {filters.location || "All locations"}
              </span>
            </span>
            <label>
              Sort by{" "}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="fee-low">Lowest fee</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="skeleton-grid">
              {[1, 2, 3, 4].map((x) => (
                <div className="skeleton-card" key={x}>
                  <i />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : doctors.length ? (
            <div className="doctor-grid directory-grid">
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={onBooking}
                  onProfile={onProfile}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matching doctors yet"
              description="Try widening your filters or clearing a few selections."
              action={
                <Button variant="outline" onClick={onClear}>
                  Clear all filters
                </Button>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

function ProfilePage({ doctor, facilities, onBack, onBook }) {
  if (!doctor || doctor.accountStatus === "deactivated" || doctor.publicationStatus === "inactive")
    return (
      <EmptyState
        title="Doctor profile unavailable"
        description="This profile may have moved."
        action={<Button onClick={onBack}>Back to doctors</Button>}
      />
    );
  const associatedClinics = facilities.filter((item) => doctor.facilityIds.includes(item.id));
  const clinic = associatedClinics[0];
  const profileClinicFee = clinic ? doctor.feesByFacility?.[clinic.id] ?? doctor.fee : doctor.fee;
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> Back to doctors
      </button>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="profile-hero surface">
            <img src={doctor.image} alt={doctor.name} />
            <div>
              <div className="profile-eyebrow">
                {doctor.verificationStatus === "verified" ? (
                  <Pill tone="verified">
                    <Check size={12} /> Verified
                  </Pill>
                ) : (
                  <Pill tone="pending">
                    {doctor.verificationStatus ||
                      "Verification status unavailable"}
                  </Pill>
                )}
              </div>
              <h1>{doctor.name}</h1>
              <p className="profile-specialty">
                {doctor.specialty} · {doctor.experienceYears} years experience
              </p>
              <p className="profile-location">
                <MapPin size={16} /> {doctor.location}
              </p>
              <div className="tag-row">
                {doctor.qualifications.map((q) => (
                  <Pill key={q}>{q}</Pill>
                ))}
                {doctor.languages.map((l) => (
                  <Pill key={l}>{l}</Pill>
                ))}
              </div>
            </div>
          </section>
          <section className="profile-section surface">
            <span className="eyebrow">QUALIFICATIONS &amp; EXPERIENCE</span>
            <h2>Training you can trust.</h2>
            <div className="qualification-list">
              {doctor.qualifications.map((q, i) => (
                <div key={q}>
                  <span className="qual-icon">
                    <Check size={15} />
                  </span>
                  <span>
                    <strong>{q}</strong>
                    <small>Qualification</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="profile-section surface">
            <span className="eyebrow">CLINIC</span>
            <h2>Where you’ll be seen.</h2>
            {associatedClinics.map((place) => (
              <div className="profile-clinic" key={place.id}>
                {place.image && <img src={place.image} alt="" />}
                <div>
                  <strong>{place.name}</strong>
                  <span>{place.address}, {place.area}, {place.city}</span>
                  <span>Consultation fee: ৳{(doctor.feesByFacility?.[place.id] ?? doctor.fee).toLocaleString()}</span>
                  <Pill tone="available"><MapPin size={12} /> {place.distanceKm} km away</Pill>
                </div>
                <a className="button button-outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.address}, ${place.area}, ${place.city}`)}`} target="_blank" rel="noreferrer">
                  Directions <ArrowUpRight size={14} />
                </a>
              </div>
            ))}
          </section>
        </div>
        <aside className="booking-sticky surface">
          <span className="eyebrow">NEXT AVAILABLE</span>
          <h3>{doctor.nextAvailable}</h3>
          <p>at {clinic?.name || "Carewell Medical Centre"}</p>
          <div className="booking-price">
            <span>Consultation fee</span>
            <strong>৳{profileClinicFee.toLocaleString()}</strong>
          </div>
          <Button type="button" onClick={() => onBook(doctor)}>
            Book an appointment <ArrowUpRight size={16} />
          </Button>
          <p className="booking-assurance"><ShieldCheck size={14} /> A request is not confirmed until the clinic responds.</p>
        </aside>
      </div>
    </>
  );
}

function FacilitiesPage({ facilities, doctors, onBook, onDoctors }) {
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");
  const filtered = facilities.filter(
    (f) =>
      f.active !== false && (kind === "all" || f.type === kind) &&
      `${f.name} ${f.area}`.toLowerCase().includes(query.toLowerCase()),
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
            placeholder="Search by clinic or area"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <MapPin size={16} />
          <span>Dhanmondi, Dhaka</span>
        </div>
        <div className="segmented">
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            Map
          </button>
        </div>
      </div>
      <div className="discovery-switch">
        {[
          ["all", "Nearby"],
          ["hospital", "Hospitals"],
          ["clinic", "Clinics"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={kind === key ? "active" : ""}
            onClick={() => setKind(key)}
          >
            {label}
          </button>
        ))}
        <span>Showing {filtered.length} places near you</span>
      </div>
      <div
        className={`facility-grid ${view === "map" ? "facility-map-layout" : ""}`}
      >
        {filtered.map((facility) => (
          <article className="facility-card surface" key={facility.id}>
            <div className="facility-image">
              <img src={facility.image} alt={facility.name} />
              <Pill>
                {facility.type === "hospital" ? "Hospital" : "Clinic"}
              </Pill>
              <span className="distance-pill">
                <MapPin size={12} /> {facility.distanceKm} km
              </span>
            </div>
            <div className="facility-body">
              <h3>{facility.name}</h3>
              <p>
                <MapPin size={14} /> {facility.address}, {facility.area},{" "}
                {facility.city}
              </p>
              <span className="facility-phone">{facility.phone}</span>
              <div className="facility-doctors">
                {doctors
                  .filter((doctor) => doctor.facilityIds.includes(facility.id))
                  .slice(0, 3)
                  .map((doctor) => (
                    <img
                      key={doctor.id}
                      src={doctor.image}
                      alt={doctor.name}
                      title={doctor.name}
                    />
                  ))}
                <button onClick={onDoctors}>
                  View specialists <ArrowRight size={13} />
                </button>
              </div>
              <div className="facility-footer">
                <span>
                  <Clock3 size={14} /> Open today · 8:00 AM–9:00 PM
                </span>
                <Button variant="outline" onClick={onDoctors}>
                  View doctors
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          title="No places found"
          description="Try a different neighborhood or category."
        />
      )}
    </>
  );
}

function AppointmentsPage({
  appointments,
  doctors,
  facilities,
  onFind,
  onCancel,
}) {
  const [tab, setTab] = useState("all");
  const filtered = appointments.filter(
    (item) => tab === "all" || item.status === tab,
  );
  return (
    <>
      <SectionHeading
        eyebrow="YOUR CARE, ALL IN ONE PLACE"
        title={
          <>
            Appointments <em>made simple.</em>
          </>
        }
        description="Keep track of what’s coming up and revisit where you’ve been."
        action={
          <Button onClick={onFind}>
            <Plus size={15} /> Book a visit
          </Button>
        }
      />
      <div className="appointment-tabs">
        {[
          ["all", "All"],
          ["pending", "Pending"],
          ["accepted", "Accepted"],
          ["rejected", "Rejected"],
          ["cancelled", "Cancelled"],
          ["completed", "History"],
        ].map(([key, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="appointment-list">
        {filtered.map((item) => {
          const doctor = doctors.find((d) => d.id === item.doctorId);
          const facility = facilities.find((f) => f.id === item.facilityId);
          return (
            <article className="appointment-card surface" key={item.id}>
              <div className="appointment-date">
                <strong>
                  {new Date(`${item.date}T12:00:00`).toLocaleDateString("en", {
                    day: "2-digit",
                  })}
                </strong>
                <span>
                  {new Date(`${item.date}T12:00:00`).toLocaleDateString("en", {
                    month: "short",
                    weekday: "short",
                  })}
                </span>
              </div>
              <img
                className="appointment-doctor-image"
                src={doctor?.image}
                alt=""
              />
              <div className="appointment-detail">
                <h3>{doctor?.name}</h3>
                <p>
                  {doctor?.specialty} · {facility?.name}
                </p>
                <span>
                  <Clock3 size={14} /> {item.time} <i /> <MapPin size={14} />{" "}
                  {facility?.area}, Dhaka
                </span>
              </div>
              <Pill
                tone={
                  item.status === "cancelled"
                    ? "error"
                    : item.status === "completed"
                      ? "neutral"
                      : "available"
                }
              >
                {item.status}
              </Pill>
              <div className="appointment-actions">
                {item.status !== "completed" && item.status !== "cancelled" && (
                  <button
                    className="text-link"
                    onClick={() => onCancel(item.id)}
                  >
                    Cancel
                  </button>
                )}
                <details className="appointment-detail-more">
                  <summary>Request details</summary>
                  <p>Reference: {item.id}{item.simulated ? " (simulated)" : ""}</p>
                  <p>Status: {item.status}; a pending request is not a confirmed appointment.</p>
                  <p>Clinic: {facility?.name || "Unavailable"} · {facility?.address || ""}</p>
                </details>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <EmptyState
          title="Nothing on the calendar yet"
          description="When you book a visit, you’ll find the details here."
          action={
            <Button onClick={onFind}>
              Find a doctor <ArrowRight size={15} />
            </Button>
          }
        />
      )}
    </>
  );
}

function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);
  useEffect(() => {
    careService
      .listConversations()
      .then((items) => {
        setConversations(items);
        setActive(items[0]?.id || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (active)
      careService
        .listMessages(active)
        .then(setMessages)
        .catch((e) => setError(e.message));
  }, [active]);
  const current = conversations.find((item) => item.id === active);
  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await careService.sendMessage(active, draft.trim());
      setMessages((items) => [...items, message]);
      setDraft("");
    } catch (error) {
      setError(error.message || "Message was not sent.");
    } finally {
      setSending(false);
    }
  };
  const attachment = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!(file.type === "application/pdf" || ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))) {
      setError("Choose a PDF, JPEG, PNG, WebP, or GIF file."); e.target.value = ""; return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file smaller than 10 MB.");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
    e.target.value = "";
  };
  const sendAttachment = async () => {
    if (!selectedFile || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await careService.sendAttachment(active, selectedFile);
      if (result) setMessages((items) => [...items, result]);
      setSelectedFile(null);
    } catch (error) {
      setError(error.message || "Attachment was not sent.");
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <SectionHeading
        eyebrow="A THOUGHTFUL FOLLOW-UP"
        title={
          <>
            A little more <em>conversation.</em>
          </>
        }
        description="Patient-to-doctor messaging requires an accepted appointment. Delivery depends on connected messaging services."
      />
      <div className="chat-panel surface">
        <aside className="chat-contacts">
          <div className="chat-contact-head">
            <strong>Conversations</strong>
            <span>{conversations.length}</span>
          </div>
          {busy ? (
            <div className="chat-loading">Loading conversations…</div>
          ) : (
            conversations.map((item) => (
              <button
                className={`chat-contact ${active === item.id ? "active" : ""}`}
                key={item.id}
                aria-label={`Open conversation with ${item.participantName}`}
                onClick={() => setActive(item.id)}
              >
                {item.participantImage ? <img src={item.participantImage} alt="" /> : <span className="chat-avatar-fallback" aria-hidden="true">{item.participantName?.[0] || "C"}</span>}
                <span>
                  <strong>{item.participantName}</strong>
                  <small>
                    {item.participantRole === "admin" ? "Doctor-to-admin conversation" : item.canMessage ? "Eligible after accepted appointment" : "Messaging unavailable until appointment accepted"}
                  </small>
                </span>
                <small>{item.updatedAt}</small>
              </button>
            ))
          )}
        </aside>
        <section className="chat-conversation">
          <header>
            {current?.participantImage ? <img src={current.participantImage} alt="" /> : current && <span className="chat-avatar-fallback" aria-hidden="true">{current.participantName?.[0] || "C"}</span>}
            <span>
              <strong>
                {current?.participantName || "Choose a conversation"}
              </strong>
              <small>
                {current?.online === true ? "Online · status supplied by service" : current?.online === false ? "Offline · status supplied by service" : current?.canMessage
                  ? "Eligible conversation · presence not supplied"
                  : "Appointment acceptance required"}
              </small>
            </span>
          </header>
          <div className="chat-notice">
            <ShieldCheck size={14} /> Do not use this service for urgent medical
            concerns.
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="message-list">
            {messages.map((message) => (
              <div
                className={`message-bubble ${message.isMine || message.sender === "patient" ? "outgoing" : ""}`}
                key={message.id}
              >
                {message.body}
                {message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noreferrer">{message.attachmentName || "Open attachment"}</a>}
                <small>
                  {message.sentAt}
                  {message.simulated ? " · simulated" : ""}
                  {message.readAt ? ` · read ${message.readAt}` : ""}
                </small>
              </div>
            ))}
            {!messages.length && !busy && (
              <div className="table-empty">
                {current
                  ? "No message history available."
                  : "Choose a conversation."}
              </div>
            )}
          </div>
          {selectedFile && <div className="attachment-preview" role="status">{previewUrl && <img src={previewUrl} alt="Selected attachment preview"/>}<span>{selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB</span><button type="button" onClick={() => setSelectedFile(null)}>Remove</button><button type="button" disabled={sending} onClick={sendAttachment}>{sending ? "Uploading…" : "Send attachment"}</button></div>}
          <form className="message-compose" onSubmit={send}>
            <input
              placeholder="Write a message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Message"
              maxLength={2000}
              disabled={!current?.canMessage || sending}
            />
            <label
              className="icon-button"
              aria-label="Choose attachment"
              title="Choose attachment"
            >
              <Plus size={16} />
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={attachment}
                disabled={!current?.canMessage}
                className="sr-only"
              />
            </label>
            <button
              type="submit"
              aria-label="Send message"
              disabled={!current?.canMessage || sending || !draft.trim()}
            >
              <ArrowRight size={17} />
            </button>
          </form>
          {serviceMode === "demo" && (
            <small className="demo-caption">
              Demo messages are local simulations; no real delivery or read
              receipts.
            </small>
          )}
        </section>
      </div>
    </>
  );
}

function AssistancePage({ onRoute }) {
  const [question, setQuestion] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <>
      <SectionHeading
        eyebrow="WE’RE HERE WITH YOU"
        title={
          <>
            How can we <em>help?</em>
          </>
        }
        description="A real person is here to make your care journey feel easier."
      />
      <div className="assistance-grid">
        <div className="assistance-card surface">
          <span className="assistance-icon">
            <MessageCircle size={20} />
          </span>
          <span className="eyebrow">TALK TO OUR TEAM</span>
          <h3>Let’s figure it out together.</h3>
          <p>
            Tell us what’s on your mind. Our patient support team is available
            every day, 8am–10pm.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) {
                setSent(true);
                setQuestion("");
              }
            }}
          >
            <label className="filter-label">
              Your question
              <textarea
                required
                minLength="8"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How can we help today?"
              />
            </label>
            <Button>
              {sent ? "Request sent" : "Send a message"}{" "}
              <ArrowRight size={15} />
            </Button>
            {sent && (
              <span className="success-inline">
                <CheckCircle2 size={14} /> We’ll be in touch shortly.
              </span>
            )}
          </form>
        </div>
        <div className="help-topics">
          <span className="eyebrow">QUICK ANSWERS</span>
          {[
            [
              "Booking an appointment",
              "Learn how to find a doctor and reserve a time.",
            ],
            ["Changing or cancelling", "Manage an upcoming appointment."],
            ["Your patient profile", "Update your contact and care details."],
            [
              "About verification",
              "How Carewell reviews professional profiles.",
            ],
          ].map(([title, detail]) => (
            <details key={title}>
              <summary>
                {title}
                <Plus size={15} />
              </summary>
              <p>{detail}</p>
            </details>
          ))}
          <div className="emergency-note">
            <span>For urgent medical concerns</span>
            <strong>Please contact your local emergency service.</strong>
          </div>
        </div>
      </div>
      <button
        className="text-link assist-doctor-link"
        onClick={() => onRoute("doctors")}
      >
        Still need help? Browse doctors <ArrowRight size={15} />
      </button>
    </>
  );
}

export {
  DiscoverPage,
  DirectoryPage,
  ProfilePage,
  FacilitiesPage,
  AppointmentsPage,
  MessagesPage,
  AssistancePage,
};
