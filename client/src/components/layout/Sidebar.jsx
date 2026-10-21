import { ArrowRight, MessageCircle } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { PATHS } from "../../constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { initials } from "../../utils/format.js";
import Brand from "./Brand.jsx";
import { describeAccount, navigationFor } from "./navigation.js";

/** Desktop sidebar navigation. Hidden on small screens (see MobileDrawer). */
export default function Sidebar() {
  const { user } = useAuth();
  const account = describeAccount(user);
  const groups = navigationFor(user);

  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace-switch">
        <span className="workspace-mark" aria-hidden="true">
          {user?.photoUrl ? <img src={user.photoUrl} alt="" /> : initials(account.name)}
        </span>
        <span>
          <strong>{account.name}</strong>
          <small>{account.type}</small>
        </span>
      </div>
      <nav className="side-nav" aria-label="Main navigation">
        {groups.map((group, index) => (
          <div key={group.label}>
            <span className={`nav-group ${index ? "nav-group-spaced" : ""}`}>{group.label}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `side-link ${isActive ? "side-link-active" : ""}`}
              >
                <item.icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card">
          <span className="help-icon">
            <MessageCircle size={16} />
          </span>
          <strong>Need a hand?</strong>
          <p>We’re here to help you find your way.</p>
          <Link to={PATHS.assistance} className="help-link">
            Visit help centre <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
