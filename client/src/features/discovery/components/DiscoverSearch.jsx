import { useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, MapPin, Search, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doctorsSearchPath } from "../../../constants/paths.js";
import { useCatalog } from "../../../context/CatalogContext.jsx";
import { Button } from "../../../components/ui";
import { POPULAR_SPECIALTY_IDS } from "../content.js";

/** Home-page search form. Submitting opens the directory with the filters in the URL. */
export default function DiscoverSearch() {
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
