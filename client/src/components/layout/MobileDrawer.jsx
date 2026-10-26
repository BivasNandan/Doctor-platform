import { ArrowRight, ArrowUpRight, Search, ShieldCheck, X } from "lucide-react";
import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PATHS } from "../../constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useModalBehavior } from "../../hooks/useModalBehavior.js";
import Brand from "./Brand.jsx";
import MessageBadge from "./MessageBadge.jsx";
import { navigationFor } from "./navigation.js";

/** Full-screen navigation for small screens. Rendered only while open. */
export default function MobileDrawer({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const drawer = useRef(null);
  useModalBehavior(drawer, onClose);
  const [query, setQuery] = useState("");
  const items = navigationFor(user)
    .flatMap((group) => group.items)
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className="mobile-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        ref={drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="mobile-drawer glass-card"
      >
        <div className="drawer-header">
          <Brand size={19} onClick={onClose} />
          <button className="drawer-close glass-pill" type="button" onClick={onClose} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>
        <div className="drawer-intro">
          <span className="eyebrow">YOUR HEALTH, YOUR WAY</span>
          <h2 id="drawer-title">Explore Carewell</h2>
        </div>
        <label className="drawer-search glass-pill">
          <Search size={17} />
          <span className="sr-only">Search navigation</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Carewell"
          />
        </label>
        <nav className="drawer-links" aria-label="Mobile navigation">
          {items.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              style={{ "--drawer-order": index }}
              className={({ isActive }) => `drawer-link glass-pill ${isActive ? "drawer-link-active" : ""}`}
            >
              <span className="drawer-link-label">
                <item.icon size={17} />
                <span>{item.label}</span>
                {item.to === PATHS.messages && <MessageBadge />}
              </span>
              <ArrowRight size={15} className="drawer-arrow" />
            </NavLink>
          ))}
        </nav>
        <div className="drawer-footer">
          <span className="drawer-footer-icon">
            <ShieldCheck size={17} />
          </span>
          <span>
            <strong>Care, handled thoughtfully.</strong>
            <small>Trusted people, clearer next steps.</small>
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(PATHS.assistance);
            }}
            aria-label="Go to help and support"
          >
            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}
