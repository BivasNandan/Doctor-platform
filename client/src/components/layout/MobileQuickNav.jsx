import { Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { PATHS } from "../../constants/paths.js";
import { QUICK_NAV } from "./navigation.js";

function QuickLink({ item }) {
  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      className={({ isActive }) => (isActive ? "quick-nav-active" : "")}
    >
      <item.icon size={19} />
      <span>{item.label}</span>
    </NavLink>
  );
}

/** Bottom tab bar, visible on phones only (CSS controls visibility). */
export default function MobileQuickNav() {
  return (
    <nav className="mobile-quick-nav glass-card-light" aria-label="Quick navigation">
      {QUICK_NAV.slice(0, 2).map((item) => (
        <QuickLink key={item.to} item={item} />
      ))}
      <NavLink to={PATHS.doctors} className="quick-nav-center" aria-label="Find a doctor">
        <Search size={21} />
      </NavLink>
      {QUICK_NAV.slice(2).map((item) => (
        <QuickLink key={item.to} item={item} />
      ))}
    </nav>
  );
}
