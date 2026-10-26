import { LayoutDashboard, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { PATHS, ROLES } from "../../constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import MessageBadge from "./MessageBadge.jsx";
import { QUICK_NAV } from "./navigation.js";

function QuickLink({ item }) {
  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      className={({ isActive }) => (isActive ? "quick-nav-active" : "")}
    >
      <span className="quick-nav-icon">
        <item.icon size={19} />
        {item.to === PATHS.messages && <MessageBadge className="nav-badge-corner" />}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}

/** Bottom tab bar, visible on phones only (CSS controls visibility). */
export default function MobileQuickNav() {
  const { user } = useAuth();
  const quickNav =
    user?.role === ROLES.DOCTOR
      ? [
          QUICK_NAV[0],
          QUICK_NAV[1],
          { to: PATHS.doctorDashboard, label: "Practice", icon: LayoutDashboard },
          QUICK_NAV[3],
        ]
      : user?.role === ROLES.ADMIN
        ? [
            QUICK_NAV[0],
            QUICK_NAV[1],
            { to: PATHS.admin, label: "Overview", icon: LayoutDashboard },
            QUICK_NAV[3],
          ]
        : QUICK_NAV;
  return (
    <nav className="mobile-quick-nav glass-card-light" aria-label="Quick navigation">
      {quickNav.slice(0, 2).map((item) => (
        <QuickLink key={item.to} item={item} />
      ))}
      <NavLink to={PATHS.doctors} className="quick-nav-center" aria-label="Find a doctor">
        <Search size={21} />
      </NavLink>
      {quickNav.slice(2).map((item) => (
        <QuickLink key={item.to} item={item} />
      ))}
    </nav>
  );
}
