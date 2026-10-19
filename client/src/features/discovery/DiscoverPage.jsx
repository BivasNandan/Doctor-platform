import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Button } from "../../components/ui.jsx";
import { doctorsSearchPath, PATHS } from "../../constants.js";
import { useCatalog } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { doctorService } from "../../services/index.js";
import { useBooking } from "../booking/Booking.jsx";
import { DoctorGrid } from "./Cards.jsx";

// ─── DiscoverPage ──────────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { openBooking } = useBooking();
  const { data: doctors, loading, error, reload } = useResource(() => doctorService.list(), []);
  const featured = doctors?.slice(0, 3);

  return (
    <>
      <HeroSection doctor={doctors?.[0]} />
      <DiscoverSearch />
      <TrustStrip />
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A GOOD PLACE TO BEGIN</span>
            <h2>
              Doctors patients <em>love.</em>
            </h2>
            <p>A few of the kind, skilled people making a difference in Dhaka.</p>
          </div>
          <Link className="text-link" to={PATHS.doctors}>
            Explore all doctors <ArrowUpRight size={15} />
          </Link>
        </div>
        <DoctorGrid
          doctors={featured}
          loading={loading}
          error={error}
          onRetry={reload}
          onBook={openBooking}
          emptyAction={
            <Link className="button button-primary" to={PATHS.doctors}>
              Browse all doctors
            </Link>
          }
        />
        <div className="doctor-bottom">
          <span>
            <i /> Platform verified professionals
          </span>
          <Link className="text-link" to={PATHS.doctors}>
            See all specialists <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <CareBanner />
      <Testimonial />
    </>
  );
}

// ─── HeroSection ───────────────────────────────────────────────────────────────────────────

/** Home-page hero. `doctor` is the profile highlighted in the floating card. */
function HeroSection({ doctor }) {
  return (
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
          Meet trusted doctors who listen, understand, and help you feel your best — wherever you are in your
          health journey.
        </p>
        <div className="hero-proof">
          <div className="avatar-stack">
            {HERO_AVATARS.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
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
          <img className="hero-image" src={HERO_IMAGE} alt="Doctor in a calm, welcoming clinic" />
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
          {doctor && (
            <div className="floating-note note-bottom">
              <Avatar src={doctor.image} name={doctor.name} />
              <span>
                <strong>{doctor.name}</strong>
                <small>
                  {doctor.specialty} · {doctor.experienceYears} years
                </small>
              </span>
            </div>
          )}
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
  );
}

// ─── DiscoverSearch ────────────────────────────────────────────────────────────────────────

/** Home-page search form. Submitting opens the directory with the filters in the URL. */
function DiscoverSearch() {
  const navigate = useNavigate();
  const { specialties } = useCatalog();
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = text
    ? specialties.filter((item) => item.name.toLowerCase().includes(text.toLowerCase())).slice(0, 3)
    : [];
  const popular = POPULAR_SPECIALTY_IDS.map((id) => specialties.find((item) => item.id === id)).filter(
    Boolean,
  );

  const submit = (event) => {
    event.preventDefault();
    // A chosen specialty replaces free text, which would otherwise over-filter.
    navigate(
      doctorsSearchPath({
        query: specialtyId ? "" : text.trim(),
        specialty: specialtyId,
        location: location.trim(),
      }),
    );
  };

  return (
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
      <form className="search-panel surface" onSubmit={submit} role="search">
        <label className="search-field">
          <Search size={19} />
          <span>
            <small>I’m looking for</small>
            <input
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setSpecialtyId("");
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Doctor, specialty or clinic"
              aria-label="Doctor, specialty or clinic"
            />
          </span>
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestion-list">
              {suggestions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSpecialtyId(item.id);
                    setText(item.name);
                    setShowSuggestions(false);
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
              value={location}
              onChange={(event) => setLocation(event.target.value)}
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
      {popular.length > 0 && (
        <div className="quick-search">
          <span>POPULAR:</span>
          {popular.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(doctorsSearchPath({ specialty: item.id }))}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── TrustStrip ────────────────────────────────────────────────────────────────────────────

function TrustStrip() {
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

// ─── CareBanner ────────────────────────────────────────────────────────────────────────────

function CareBanner() {
  const navigate = useNavigate();
  return (
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
          No guesswork. No rushed decisions. Just thoughtful people, clear next steps, and care built around
          you.
        </p>
        <Button variant="light" onClick={() => navigate(PATHS.doctors)}>
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
  );
}

// ─── Testimonial ───────────────────────────────────────────────────────────────────────────

function Testimonial() {
  return (
    <section className="community-quote">
      <span className="eyebrow">KIND WORDS, REAL PEOPLE</span>
      <h2>
        Feeling better starts
        <br />
        with <em>feeling heard.</em>
      </h2>
      <blockquote>“{TESTIMONIAL.quote}”</blockquote>
      <div className="quote-author">
        <img src={TESTIMONIAL.avatar} alt="" loading="lazy" />
        <span>
          <strong>{TESTIMONIAL.author}</strong>
          <small>{TESTIMONIAL.detail}</small>
        </span>
        <b>★★★★★</b>
      </div>
    </section>
  );
}

// ─── content ───────────────────────────────────────────────────────────────────────────────

/**
 * Static marketing copy and options for the discovery screens.
 * The stats below are placeholders: replace them with a public stats endpoint
 * (e.g. GET /stats/public) before launch rather than hard-coding real claims.
 */

/** External stock imagery. Host these in /public/images for production. */
export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=85";

export const HERO_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces",
];

export const TRUST_STATS = [
  { value: "250", suffix: "+", label: "verified specialists" },
  { value: "18", suffix: "k", label: "appointments made" },
  { value: "4.9", suffix: "★", label: "patient experience" },
];

/** Specialty ids offered as one-click shortcuts under the search box. */
export const POPULAR_SPECIALTY_IDS = ["cardiology", "dermatology", "dentistry", "pediatrics"];

export const AVAILABILITY_OPTIONS = ["Today", "Tomorrow", "This week"];

export const FEE_RANGE = { min: 500, max: 3000, step: 100 };

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "fee-low", label: "Lowest fee" },
  { value: "experience", label: "Most experienced" },
];

export const TESTIMONIAL = {
  quote:
    "For the first time, finding a doctor felt simple. I booked in a few minutes and Dr. Nusrat made me feel completely at ease.",
  author: "Demo patient",
  detail: "Carewell patient · Dhaka",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces",
};
