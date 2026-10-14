import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Compass,
  Hospital,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  X,
} from "lucide-react";

const routes = [
  { id: "discover", label: "Discover", icon: Compass, group: "CARE" },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "facilities", label: "Hospitals & clinics", icon: Hospital },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "messages", label: "Messages", icon: MessageCircle, badge: "1" },
  { id: "admin", label: "Overview", icon: LayoutDashboard, group: "ADMIN" },
  { id: "admin-doctors", label: "Doctor management", icon: Users },
  { id: "verification", label: "Verification", icon: ShieldCheck, badge: "4" },
  { id: "admin-facilities", label: "Facility management", icon: Hospital },
  {
    id: "admin-appointments",
    label: "Appointment management",
    icon: CalendarDays,
  },
  { id: "specialties", label: "Specialties", icon: ListFilter },
  { id: "availability", label: "Availability", icon: Clock3 },
  { id: "doctor-register", label: "Doctor registration", icon: Plus },
  { id: "doctor-login", label: "Doctor sign in", icon: Users },
  { id: "doctor-dashboard", label: "Doctor workspace", icon: LayoutDashboard },
  { id: "admin-login", label: "Administrator sign in", icon: ShieldCheck },
];

function routeTitle(page) {
  return (
    {
      discover: "Discover care",
      doctors: "Find a doctor",
      facilities: "Hospitals & clinics",
      appointments: "Appointments",
      messages: "Messages",
      assistance: "Help & support",
      admin: "Overview",
      "admin-doctors": "Doctor management",
      verification: "Verification",
      "admin-facilities": "Facility management",
      "admin-appointments": "Appointment management",
      specialties: "Specialties",
      availability: "Availability",
    }[page] || "Doctor profile"
  );
}

function MobileDrawer({ open, page, onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const closeButton = useRef(null);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
  if (!open) return null;
  const matches = routes.filter((route) =>
    route.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="mobile-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="mobile-drawer glass-card"
        role="dialog"
        aria-modal="true"
        aria-label="Carewell navigation"
      >
        <div className="drawer-header">
          <a
            className="brand"
            href="#discover"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("discover");
              onClose();
            }}
          >
            <span className="brand-mark">
              <Activity size={19} />
            </span>
            <span>
              carewell<span className="brand-period">.</span>
            </span>
          </a>
          <button
            className="drawer-close glass-pill"
            ref={closeButton}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="drawer-intro">
          <span className="eyebrow">YOUR HEALTH, YOUR WAY</span>
          <h2>Explore Carewell</h2>
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
          {matches.map((route, index) => (
            <button
              key={route.id}
              className={`drawer-link glass-pill ${page === route.id ? "drawer-link-active" : ""}`}
              style={{ "--drawer-order": index }}
              onClick={() => {
                onNavigate(route.id);
                onClose();
              }}
            >
              <span className="drawer-link-label">
                <route.icon size={17} />
                <span>{route.label}</span>
              </span>
              {route.badge && <i className="drawer-badge">{route.badge}</i>}
              <ArrowRight size={15} className="drawer-arrow" />
            </button>
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
            onClick={() => {
              onNavigate("assistance");
              onClose();
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

function MobileQuickNav({ page, onNavigate }) {
  const items = [
    { id: "discover", label: "Discover", icon: Compass },
    { id: "facilities", label: "Places", icon: Hospital },
    { id: "appointments", label: "Visits", icon: CalendarDays },
    { id: "messages", label: "Messages", icon: MessageCircle },
  ];
  return (
    <nav
      className="mobile-quick-nav glass-card-light"
      aria-label="Quick navigation"
    >
      {items.slice(0, 2).map((item) => (
        <button
          key={item.id}
          className={page === item.id ? "quick-nav-active" : ""}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
        >
          <item.icon size={19} />
          <span>{item.label}</span>
        </button>
      ))}
      <button
        className="quick-nav-center"
        onClick={() => onNavigate("doctors")}
        aria-label="Find a doctor"
      >
        <Search size={21} />
      </button>
      {items.slice(2).map((item) => (
        <button
          key={item.id}
          className={page === item.id ? "quick-nav-active" : ""}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
        >
          <item.icon size={19} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function AccountMenu({ user, doctor, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const isDoctor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";
  const displayName = isDoctor
    ? doctor?.name || "Doctor workspace"
    : isAdmin
      ? "Carewell administrator"
      : "Demo patient";
  const accountType = isDoctor
    ? doctor?.specialty || "Doctor account"
    : isAdmin
      ? "Administrator account"
      : "Fictional patient workspace";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const primaryRoute = isDoctor ? "doctor-dashboard" : isAdmin ? "admin" : "appointments";

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const goTo = (route) => {
    setOpen(false);
    onNavigate(route);
  };

  const signOut = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <div className="account-menu-wrap" ref={menuRef}>
      <button
        className="account-trigger glass-pill"
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <UserRound size={18} />
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="account-menu surface" role="menu" aria-label="Account menu">
          <div className="account-summary">
            <span className="account-avatar" aria-hidden="true">{initials}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{accountType}</small>
            </span>
          </div>
          <div className="account-details">
            <span>{user ? "Signed in to Carewell" : "Demo mode · identity is not verified"}</span>
            {doctor?.accountStatus && <span>Account status: {doctor.accountStatus}</span>}
          </div>
          <div className="account-menu-divider" />
          <button className="account-menu-item" type="button" onClick={() => goTo(primaryRoute)}>
            <UserRound size={15} />
            <span>{isDoctor ? "Open doctor workspace" : isAdmin ? "Open admin overview" : "View appointments"}</span>
          </button>
          <button className="account-menu-item" type="button" onClick={() => goTo("assistance")}>
            <ShieldCheck size={15} />
            <span>Help &amp; support</span>
          </button>
          {user ? (
            <button className="account-menu-item account-menu-danger" type="button" onClick={signOut}>
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          ) : (
            <button className="account-menu-item" type="button" onClick={() => goTo("doctor-login")}>
              <UserRound size={15} />
              <span>Doctor sign in</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { routes, routeTitle, MobileDrawer, MobileQuickNav, AccountMenu };
