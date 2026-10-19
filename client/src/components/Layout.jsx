import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Hospital,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Sun,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Link, matchPath, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isDemoMode, PATHS, ROLES } from "../constants.js";
import { useAuth, useTheme, useToast } from "../context.jsx";
import { useDocumentTitle, useModalBehavior, useResource } from "../hooks.js";
import { notificationService } from "../services/index.js";
import { initials, timeAgo } from "../utils.js";
import { ErrorBoundary, IconButton, PageLoader } from "./ui.jsx";

// ─── AppShell ──────────────────────────────────────────────────────────────────────────────

/** Chrome shared by every screen: sidebar, topbar, footer and mobile navigation. */
export default function AppShell() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const main = useRef(null);

  useDocumentTitle(routeTitle(pathname));

  // Start every navigation at the top and close the mobile drawer.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Sidebar />
      <div className="main-column">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="page-content" id="main-content" ref={main} tabIndex={-1}>
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
      <MobileQuickNav />
    </div>
  );
}

// ─── Topbar ────────────────────────────────────────────────────────────────────────────────

function Topbar({ onOpenMenu }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <header className="topbar nav-shell">
      <div className="nav-identity">
        <div className="topbar-brand glass-card-light">
          <Link className="topbar-brand-home" to={PATHS.discover}>
            <span className="brand-mark">
              <Activity size={17} />
            </span>
            <span className="topbar-brand-copy">
              <strong>Carewell</strong>
              <small>HEALTH PORTAL · {isDemoMode ? "SIMULATED DEMO" : "CONNECTED"}</small>
            </span>
          </Link>
          <span className="brand-crumb">
            <ChevronRight size={13} />
            <strong>{routeTitle(pathname)}</strong>
          </span>
        </div>
      </div>
      <div className="command-pill glass-card-light">
        <IconButton label={`Switch to ${nextTheme} theme`} onClick={toggleTheme}>
          {resolvedTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </IconButton>
        <NotificationBell />
        <AccountMenu />
      </div>
      <button className="mobile-menu glass-pill" type="button" onClick={onOpenMenu} aria-label="Open menu">
        <Menu size={19} />
      </button>
    </header>
  );
}

// ─── NotificationBell ──────────────────────────────────────────────────────────────────────

const NOTIFICATION_REFRESH_MS = 10_000;
const KIND_ICONS = {
  appointment: CalendarCheck,
  message: MessageCircle,
  doctor: Stethoscope,
  account: ShieldCheck,
  support: LifeBuoy,
};

/** Closes a dropdown on an outside click or Escape. */
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) close();
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

/**
 * The bell: an unread badge and a menu of what happened (appointment updates, messages, reviews…).
 * It refreshes by itself every few seconds while the tab is visible and pops a toast when something
 * new arrives. Guests see a disabled bell.
 */
function NotificationBell() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const seen = useRef(null); // ids already shown; null until the first load
  const feed = useResource(() => notificationService.list({ limit: 20 }), [user?.id], {
    enabled: Boolean(user),
    refreshMs: NOTIFICATION_REFRESH_MS,
  });
  const items = feed.data?.items ?? [];
  const unread = feed.data?.unreadCount ?? 0;
  useDismiss(wrapRef, open, () => setOpen(false));

  // Toast for anything that arrived since the last refresh (never for the first load).
  useEffect(() => {
    if (!user) {
      seen.current = null;
      return;
    }
    if (!feed.data) return;
    const fresh = feed.data.items.filter((item) => !seen.current?.has(item.id));
    if (seen.current)
      fresh
        .filter((item) => !item.read)
        .slice(0, 2)
        .forEach((item) => notify(item.title));
    seen.current = new Set(feed.data.items.map((item) => item.id));
  }, [feed.data, user, notify]);

  if (!user)
    return (
      <IconButton label="Notifications (available after you sign in)" disabled aria-disabled="true">
        <Bell size={16} />
      </IconButton>
    );

  const markLocally = (ids) =>
    feed.setData(
      (current) =>
        current && {
          items: current.items.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)),
          unreadCount: Math.max(
            0,
            current.unreadCount - current.items.filter((item) => ids.includes(item.id) && !item.read).length,
          ),
        },
    );

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      markLocally([item.id]);
      notificationService.markRead(item.id).catch(() => feed.reload());
    }
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    markLocally(items.map((item) => item.id));
    try {
      await notificationService.markAllRead();
      feed.reload();
    } catch {
      feed.reload();
    }
  };

  return (
    <div className="account-menu-wrap" ref={wrapRef}>
      <IconButton
        label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={16} />
        {unread > 0 && <span className="notification-count">{unread > 99 ? "99+" : unread}</span>}
      </IconButton>
      {open && (
        <div className="account-menu notification-panel surface" role="dialog" aria-label="Notifications">
          <div className="notification-head">
            <strong>Notifications</strong>
            <button type="button" className="link-button" onClick={readAll} disabled={!unread}>
              Mark all as read
            </button>
          </div>
          {!items.length ? (
            <p className="notification-empty">{feed.loading ? "Loading…" : "You’re all caught up."}</p>
          ) : (
            <ul className="notification-list">
              {items.map((item) => {
                const Icon = KIND_ICONS[item.kind] ?? Bell;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`notification-item ${item.read ? "" : "unread"}`}
                      onClick={() => openItem(item)}
                    >
                      <span className="notification-icon" aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      <span className="notification-text">
                        <strong>{item.title}</strong>
                        {item.body && <small>{item.body}</small>}
                        <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
                      </span>
                      {!item.read && <span className="notification-unread-dot" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AccountMenu ───────────────────────────────────────────────────────────────────────────

/** Account chip in the topbar with a dropdown menu. */
function AccountMenu() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const account = describeAccount(user);

  useEffect(() => {
    if (!open) return undefined;
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

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  const signOut = async () => {
    setOpen(false);
    try {
      await logout();
    } catch (error) {
      notify(error.message);
    }
    navigate(PATHS.discover);
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
            <span className="account-avatar" aria-hidden="true">
              {initials(account.name)}
            </span>
            <span>
              <strong>{account.name}</strong>
              <small>{account.type}</small>
            </span>
          </div>
          <div className="account-details">
            <span>
              {user
                ? "Signed in to Carewell"
                : isDemoMode
                  ? "Demo mode · identity is not verified"
                  : "Not signed in"}
            </span>
            {user?.accountStatus && <span>Account status: {user.accountStatus}</span>}
          </div>
          <div className="account-menu-divider" />
          <button
            role="menuitem"
            className="account-menu-item"
            type="button"
            onClick={() => goTo(account.home)}
          >
            <UserRound size={15} />
            <span>{account.homeLabel}</span>
          </button>
          {user?.role === ROLES.PATIENT && (
            <button
              role="menuitem"
              className="account-menu-item"
              type="button"
              onClick={() => goTo(PATHS.profile)}
            >
              <UserRound size={15} />
              <span>My profile</span>
            </button>
          )}
          <button
            role="menuitem"
            className="account-menu-item"
            type="button"
            onClick={() => goTo(PATHS.assistance)}
          >
            <ShieldCheck size={15} />
            <span>Help &amp; support</span>
          </button>
          {user ? (
            <button
              role="menuitem"
              className="account-menu-item account-menu-danger"
              type="button"
              onClick={signOut}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              role="menuitem"
              className="account-menu-item"
              type="button"
              onClick={() => goTo(PATHS.signup)}
            >
              <UserRound size={15} />
              <span>Create account</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────────────────

/** Desktop sidebar navigation. Hidden on small screens (see MobileDrawer). */
function Sidebar() {
  const { user } = useAuth();
  const account = describeAccount(user);
  const groups = navigationFor(user);

  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace-switch">
        <span className="workspace-mark" aria-hidden="true">
          {initials(account.name)}
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

// ─── MobileDrawer ──────────────────────────────────────────────────────────────────────────

/** Full-screen navigation for small screens. Rendered only while open. */
function MobileDrawer({ onClose }) {
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

// ─── MobileQuickNav ────────────────────────────────────────────────────────────────────────

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
function MobileQuickNav() {
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

// ─── Brand ─────────────────────────────────────────────────────────────────────────────────

/** Carewell wordmark linking home. */
function Brand({ size = 20, onClick }) {
  return (
    <Link className="brand" to={PATHS.discover} onClick={onClick}>
      <span className="brand-mark">
        <Activity size={size} />
      </span>
      <span>
        carewell<span className="brand-period">.</span>
      </span>
    </Link>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="page-footer">
      <span>© {new Date().getFullYear()} Carewell Health</span>
      <span>Thoughtful care, closer to you</span>
      <Link to={PATHS.assistance}>Help &amp; support</Link>
    </footer>
  );
}

// ─── accountSummary ────────────────────────────────────────────────────────────────────────

/** Display details for the account chip, menu and sidebar. */
export function describeAccount(user) {
  if (user?.role === ROLES.DOCTOR)
    return {
      name: user.name || "Doctor workspace",
      type: "Doctor account",
      home: PATHS.doctorDashboard,
      homeLabel: "Open doctor workspace",
    };
  if (user?.role === ROLES.ADMIN)
    return {
      name: user.name || "Carewell administrator",
      type: "Administrator account",
      home: PATHS.admin,
      homeLabel: "Open admin overview",
    };
  if (user?.role === ROLES.PATIENT)
    return {
      name: user.name || "Patient",
      type: "Patient account",
      home: PATHS.appointments,
      homeLabel: "My appointments",
    };
  return {
    name: "Guest",
    type: "Not signed in",
    home: PATHS.login,
    homeLabel: "Sign in",
  };
}

// ─── navigation ────────────────────────────────────────────────────────────────────────────

/** Pages shown in the browser tab, the topbar breadcrumb and the document title. */
const ROUTE_TITLES = [
  [PATHS.discover, "Discover care"],
  [PATHS.doctors, "Find a doctor"],
  ["/doctors/:doctorId", "Doctor profile"],
  [PATHS.facilities, "Hospitals & clinics"],
  [PATHS.appointments, "Appointments"],
  [PATHS.messages, "Messages"],
  [PATHS.assistance, "Help & support"],
  [PATHS.login, "Sign in"],
  [PATHS.signup, "Create account"],
  [PATHS.verifyEmail, "Verify email"],
  [PATHS.forgotPassword, "Forgot password"],
  [PATHS.resetPassword, "Reset password"],
  [PATHS.profile, "Your profile"],
  [PATHS.doctorLogin, "Doctor sign in"],
  [PATHS.doctorRegister, "Doctor registration"],
  [PATHS.doctorDashboard, "Doctor workspace"],
  [PATHS.adminLogin, "Administrator sign in"],
  [PATHS.admin, "Overview"],
  [PATHS.adminDoctors, "Doctor management"],
  [PATHS.adminVerification, "Verification"],
  [PATHS.adminFacilities, "Facility management"],
  [PATHS.adminAppointments, "Appointment management"],
  [PATHS.adminSpecialties, "Specialties"],
  [PATHS.adminAvailability, "Availability"],
];

export function routeTitle(pathname) {
  const match = ROUTE_TITLES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
  return match?.[1] ?? "Page not found";
}

const BROWSE_ITEMS = [
  { to: PATHS.discover, label: "Discover", icon: Compass },
  { to: PATHS.doctors, label: "Doctors", icon: Stethoscope },
  { to: PATHS.facilities, label: "Hospitals & clinics", icon: Hospital },
];
const APPOINTMENTS_ITEM = { to: PATHS.appointments, label: "Appointments", icon: CalendarDays };
const MESSAGES_ITEM = { to: PATHS.messages, label: "Messages", icon: MessageCircle };

const GUEST_ACCOUNT_GROUP = {
  label: "ACCOUNT",
  items: [
    { to: PATHS.login, label: "Sign in", icon: LogIn },
    { to: PATHS.signup, label: "Create account", icon: UserPlus },
  ],
};

const PATIENT_ACCOUNT_GROUP = {
  label: "ACCOUNT",
  items: [{ to: PATHS.profile, label: "My profile", icon: UserRound }],
};

const GUEST_GROUP = {
  label: "FOR PROFESSIONALS",
  items: [
    { to: PATHS.doctorRegister, label: "Doctor registration", icon: Plus },
    { to: PATHS.doctorLogin, label: "Doctor sign in", icon: Users },
    { to: PATHS.adminLogin, label: "Administrator sign in", icon: ShieldCheck },
  ],
};

const DOCTOR_GROUP = {
  label: "MY PRACTICE",
  items: [{ to: PATHS.doctorDashboard, label: "Doctor workspace", icon: LayoutDashboard }],
};

const ADMIN_GROUP = {
  label: "ADMIN",
  items: [
    { to: PATHS.admin, label: "Overview", icon: LayoutDashboard, end: true },
    { to: PATHS.adminDoctors, label: "Doctor management", icon: Users },
    { to: PATHS.adminVerification, label: "Verification", icon: ShieldCheck },
    { to: PATHS.adminFacilities, label: "Facility management", icon: Hospital },
    { to: PATHS.adminAppointments, label: "Appointment management", icon: CalendarDays },
    { to: PATHS.adminSpecialties, label: "Specialties", icon: ListFilter },
    { to: PATHS.adminAvailability, label: "Availability", icon: Clock3 },
  ],
};

/** Navigation groups visible to the given user (null = signed out). */
export function navigationFor(user) {
  // Guests see the patient-only pages too: opening one asks them to sign in.
  const isPatientView = !user || user.role === ROLES.PATIENT;
  const care = {
    label: "CARE",
    items: [...BROWSE_ITEMS, ...(isPatientView ? [APPOINTMENTS_ITEM] : []), MESSAGES_ITEM],
  };
  const groups = [care];
  if (!user) groups.push(GUEST_ACCOUNT_GROUP, GUEST_GROUP);
  if (user?.role === ROLES.PATIENT) groups.push(PATIENT_ACCOUNT_GROUP);
  if (user?.role === ROLES.DOCTOR) groups.push(DOCTOR_GROUP);
  if (user?.role === ROLES.ADMIN) groups.push(ADMIN_GROUP);
  return groups;
}

/** Bottom bar for small screens. */
export const QUICK_NAV = [
  { to: PATHS.discover, label: "Discover", icon: Compass },
  { to: PATHS.facilities, label: "Places", icon: Hospital },
  { to: PATHS.appointments, label: "Visits", icon: CalendarDays },
  { to: PATHS.messages, label: "Messages", icon: MessageCircle },
];
