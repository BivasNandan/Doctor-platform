import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Compass,
  Heart,
  Hospital,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { careService, serviceMode } from "./data/careService.js";
import { adminSummary } from "./data/mockData.js";
import {
  DoctorAccess,
  DoctorPortal,
  PortalAccessNotice,
} from "./PortalPages.jsx";

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

function IconButton({ children, label, ...props }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
function Button({ children, variant = "primary", ...props }) {
  return (
    <button className={`button button-${variant}`} {...props}>
      {children}
    </button>
  );
}

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
function Pill({ children, tone = "neutral" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Sparkles size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function DoctorCard({ doctor, onBook, onProfile }) {
  return (
    <article className="doctor-card surface">
      <div className="doctor-photo">
        <img src={doctor.image} alt={doctor.name} />
        <span className="availability">
          <i />
          {doctor.availability.includes("Today")
            ? "Available today"
            : doctor.nextAvailable}
        </span>
      </div>
      <div className="doctor-info">
        <div className="doctor-heading">
          <div>
            <button
              className="doctor-name"
              onClick={() => onProfile(doctor.id)}
            >
              {doctor.name}
            </button>
            <p>{doctor.specialty}</p>
          </div>
        </div>
        <div className="doctor-meta">
          <span>
            <Clock3 size={14} /> {doctor.experienceYears} years experience
          </span>
          <span>
            <MapPin size={14} /> {doctor.location}
          </span>
        </div>
        <div className="tag-row">
          {doctor.verified && (
            <Pill tone="verified">
              <Check size={12} /> Verified
            </Pill>
          )}
          {doctor.languages.slice(0, 2).map((language) => (
            <Pill key={language}>{language}</Pill>
          ))}
        </div>
        <div className="doctor-footer">
          <div>
            <small>CONSULTATION</small>
            <strong>৳{doctor.fee.toLocaleString()}</strong>
          </div>
          <Button type="button" variant="outline" onClick={() => onBook(doctor)}>
            Book visit <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function App() {
  const [page, setPage] = useState(() => location.hash.slice(1) || "discover");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("carewell-theme") || "dark",
  );
  const [resolvedTheme, setResolvedTheme] = useState(
    () => document.documentElement.dataset.theme || "dark",
  );
  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const [doctors, setDoctors] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({
    query: "",
    specialty: "",
    location: "Dhanmondi",
    maxFee: "",
    language: "",
    available: "",
    verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("5:30 PM");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [user, setUser] = useState(null);

  const refreshDoctors = async (next = filters) => {
    setLoading(true);
    try {
      setDoctors(await careService.listDoctors(next));
    } catch (error) {
      setToast(error.message || "Doctor directory is unavailable.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    careService.listFacilities().then(setFacilities);
    careService.listSpecialties().then(setSpecialties);
    careService.listAppointments().then(setAppointments);
    refreshDoctors({ ...filters, location: "" });
  }, []);
  useEffect(() => {
    if (user?.role === "admin") careService.listAdminDoctors().then(setDoctors).catch((error) => setToast(error.message));
    else if (user) careService.listDoctors().then(setDoctors).catch((error) => setToast(error.message));
  }, [user?.role]);
  useEffect(() => {
    localStorage.setItem("carewell-theme", theme);
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const nextTheme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = nextTheme;
      setResolvedTheme(nextTheme);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const onHash = () => setPage(location.hash.slice(1) || "discover");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (
      (page === "admin" ||
        page.startsWith("admin-") ||
        ["verification", "specialties", "availability"].includes(page)) &&
      user?.role !== "admin"
    ) {
      location.hash = "admin-login";
      setPage("admin-login");
    } else if (page === "doctor-dashboard" && user?.role !== "doctor") {
      location.hash = "doctor-login";
      setPage("doctor-login");
    }
  }, [page, user]);
  useEffect(() => {
    if (page !== "doctors") return;
    const timer = window.setTimeout(() => refreshDoctors(filters), 180);
    return () => window.clearTimeout(timer);
  }, [page, filters]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort((a, b) =>
        sort === "fee-low"
          ? a.fee - b.fee
          : 0,
      ),
    [doctors, sort],
  );
  const publicDoctors = sortedDoctors.filter((doctor) => doctor.accountStatus !== "deactivated" && !["inactive", "unpublished"].includes(doctor.publicationStatus));
  const navigate = (to) => {
    if (
      (to === "admin" ||
        to.startsWith("admin-") ||
        to === "verification" ||
        to === "specialties" ||
        to === "availability") &&
      user?.role !== "admin"
    )
      to = "admin-login";
    if (
      to.startsWith("doctor-") &&
      to === "doctor-dashboard" &&
      user?.role !== "doctor"
    )
      to = "doctor-login";
    location.hash = to;
    setPage(to);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const applySearch = async (event) => {
    event?.preventDefault();
    setSearchOpen(false);
    await refreshDoctors(filters);
    navigate("doctors");
  };
  const clearFilters = async () => {
    const clean = {
      query: "",
      specialty: "",
      location: "",
      maxFee: "",
      language: "",
      available: "",
      verified: false,
    };
    setFilters(clean);
  };
  const openBooking = (doctor) => {
    setBookingDoctor(doctor);
    setSelectedDate("");
    setSelectedTime("");
  };
  const submitBooking = async (event, bookingDetails) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const patientName = form.get("patientName")?.toString().trim();
    const phone = form.get("phone")?.toString().trim();
    const email = form.get("email")?.toString().trim();
    const reason = form.get("reason")?.toString().trim();
    if (
      !patientName ||
      !/^\+?[0-9\s-]{8,18}$/.test(phone) ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !reason
    ) {
      setToast("Please complete each field with valid details.");
      return;
    }
    try {
      const appointment = await careService.submitAppointment({
        doctorId: bookingDoctor.id,
        facilityId: bookingDetails.clinicId,
        date: bookingDetails.date,
        time: bookingDetails.selectedTime,
        patientName,
        phone,
        email,
        reason,
      });
      setAppointments(await careService.listAppointments());
      setBookingDoctor(null);
      setToast(
        `${appointment.simulated ? "Simulated request submitted" : "Request submitted"} for ${bookingDoctor.name} at ${facilities.find((item) => item.id === bookingDetails.clinicId)?.name || "the selected clinic"}, ${bookingDetails.date} · ${bookingDetails.selectedTime}. Status: ${appointment.status}. Reference ${appointment.id}`,
      );
      navigate("appointments");
    } catch (error) {
      setToast(
        error.message || "Request could not be submitted. Please try again.",
      );
    }
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className="sidebar">
        <a className="brand" href="#discover">
          <span className="brand-mark">
            <Activity size={20} />
          </span>
          <span>
            carewell<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-mark">R</span>
          <span>
            <strong>Demo patient</strong>
            <small>Fictional patient workspace</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {routes.map((route, index) => (
            <div key={route.id}>
              {route.group && (
                <span
                  className={`nav-group ${index ? "nav-group-spaced" : ""}`}
                >
                  {route.group}
                </span>
              )}
              <a
                href={`#${route.id}`}
                className={`side-link ${page === route.id ? "side-link-active" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(route.id);
                }}
              >
                <route.icon size={17} strokeWidth={1.8} />
                <span>{route.label}</span>
                {route.badge && <i className="nav-badge">{route.badge}</i>}
              </a>
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
            <button onClick={() => navigate("assistance")}>
              Visit help centre <ArrowRight size={13} />
            </button>
          </div>
          <button className="profile-switch">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
              alt=""
            />
            <span>
              <strong>Demo patient</strong>
              <small>Patient account</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar nav-shell">
          <div className="nav-identity">
            <div className="topbar-brand glass-card-light">
              <a
                className="topbar-brand-home"
                href="#discover"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("discover");
                }}
              >
                <span className="brand-mark">
                  <Activity size={17} />
                </span>
                <span className="topbar-brand-copy">
                  <strong>Carewell</strong>
                  <small>
                    HEALTH PORTAL ·{" "}
                    {serviceMode === "demo" ? "SIMULATED DEMO" : "CONNECTED"}
                  </small>
                </span>
              </a>
              <span className="brand-crumb">
                <ChevronRight size={13} />
                <strong>{routeTitle(page)}</strong>
              </span>
            </div>
          </div>
          <div className="command-pill glass-card-light">
            <IconButton
              label={`Switch to ${activeTheme === "dark" ? "light" : "dark"} theme`}
              onClick={() =>
                setTheme(activeTheme === "dark" ? "light" : "dark")
              }
            >
              {activeTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            </IconButton>
            <IconButton label="Notifications">
              <Bell size={16} />
              <i className="notification-dot" />
            </IconButton>
            {user && (
              <button
                className="nav-account"
                onClick={async () => {
                  try {
                    await careService.logout();
                  } catch (e) {
                    setToast(e.message);
                  }
                  setUser(null);
                  navigate("discover");
                }}
              >
                Sign out
              </button>
            )}
            <button
              className="desktop-menu-button glass-pill"
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
          <button
            className="mobile-menu glass-pill"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>
        </header>
        <main className="page-content">
          {page === "discover" && (
            <DiscoverPage
            doctors={publicDoctors}
              facilities={facilities}
              specialties={specialties}
              filters={filters}
              updateFilter={updateFilter}
              onSearch={applySearch}
              onBooking={openBooking}
              onProfile={(id) => navigate(`profile-${id}`)}
              onRoute={navigate}
              loading={loading}
            />
          )}
          {page === "doctors" && (
            <DirectoryPage
            doctors={publicDoctors}
              specialties={specialties}
              filters={filters}
              updateFilter={updateFilter}
              onSearch={applySearch}
              onClear={clearFilters}
              onBooking={openBooking}
              onProfile={(id) => navigate(`profile-${id}`)}
              loading={loading}
              sort={sort}
              setSort={setSort}
            />
          )}
          {page.startsWith("profile-") && (
            <ProfilePage
              doctor={doctors.find((item) => item.id === page.slice(8)) || null}
              facilities={facilities}
              onBack={() => navigate("doctors")}
              onBook={openBooking}
            />
          )}
          {page === "facilities" && (
            <FacilitiesPage
              facilities={facilities}
              doctors={publicDoctors}
              onBook={openBooking}
              onDoctors={() => navigate("doctors")}
            />
          )}
          {page === "appointments" && (
            <AppointmentsPage
              appointments={appointments}
              doctors={doctors}
              facilities={facilities}
              onFind={() => navigate("doctors")}
              onCancel={async (id) => {
                try {
                  const updated = await careService.cancelAppointment(id);
                  setAppointments((items) => items.map((item) => item.id === id ? updated : item));
                  setToast(`Request ${updated.id} marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
                } catch (error) { setToast(error.message); }
              }}
            />
          )}
          {page === "messages" && <MessagesPage />}
          {page === "assistance" && <AssistancePage onRoute={navigate} />}
          {page === "admin" && <AdminOverview onRoute={navigate} />}
          {page === "admin-doctors" && (
            <DoctorManagement
              doctors={doctors}
              facilities={facilities}
              onAdd={async (data) => {
                const created = await careService.addDoctor(data);
                setDoctors((items) => [created, ...items]);
                setToast("Doctor profile saved as pending verification.");
              }}
              onVerify={async (doctor, status) => {
                await careService.updateDoctorStatus(doctor.id, status);
                setDoctors(await careService.listAdminDoctors());
                setToast(`${doctor.name} ${status}${serviceMode === "demo" ? " (simulated)" : ""}.`);
              }}
              onPublicationChange={async (doctor, status) => {
                try {
                  const updated = await careService.setDoctorPublicationStatus(doctor.id, status);
                  setDoctors((items) => items.map((item) => item.id === updated.id ? updated : item));
                  setToast(`${doctor.name} profile ${status}${updated.simulated ? " (simulated)" : ""}.`);
                } catch (error) { setToast(error.message); }
              }}
              onUpdate={async (doctor, input) => {
                try { const result = await careService.updateDoctor(doctor.id, input); setDoctors(items => items.map(item => item.id === result.id ? result : item)); setToast(`Updated ${result.name}.`); }
                catch (error) { setToast(error.message); throw error; }
              }}
              onDeactivate={async (doctor) => {
                if (!window.confirm(`Deactivate ${doctor.name}? This changes their public profile state.`)) return;
                try { const result = await careService.deactivateDoctor(doctor.id); setDoctors(items => items.map(item => item.id === result.id ? result : item)); setToast(`${result.name} deactivated${result.simulated ? " (simulated)" : ""}.`); }
                catch (error) { setToast(error.message); }
              }}
            />
          )}
          {page === "verification" && (
            <VerificationPage
              doctors={doctors}
              onVerify={async (doctor, status) => {
                await careService.updateDoctorStatus(doctor.id, status);
                setDoctors(await careService.listAdminDoctors());
                setToast(`${doctor.name} ${status}.`);
              }}
            />
          )}
          {page === "admin-facilities" && (
            <FacilityManagement
              facilities={facilities}
              onSave={async (id, data) => {
                if (id) {
                  await careService.updateFacility(id, data);
                  setFacilities(await careService.listFacilities());
                  setToast("Facility details updated.");
                } else {
                  const added = await careService.addFacility(data);
                  setFacilities((items) => [added, ...items]);
                  setToast("Facility profile saved.");
                }
              }}
              onDeactivate={async (facility) => {
                if (!window.confirm(`Deactivate ${facility.name}?`)) return;
                try { const updated = await careService.deactivateFacility(facility.id); setFacilities(items => items.map(item => item.id === updated.id ? updated : item)); setToast(`${updated.name} deactivated${updated.simulated ? " (simulated)" : ""}.`); }
                catch (error) { setToast(error.message); }
              }}
            />
          )}
          {page === "admin-appointments" && (
            <AppointmentManagement
              appointments={appointments}
              doctors={doctors}
              facilities={facilities}
              onStatus={async (id, status) => {
                try {
                  const updated = await careService.updateAdminAppointmentStatus(id, status);
                  setAppointments((items) => items.map((item) => item.id === id ? updated : item));
                  setToast(`Appointment marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
                } catch (error) { setToast(error.message); }
              }}
            />
          )}
          {page === "specialties" && (
            <SpecialtiesPage
              specialties={specialties}
              onAdd={async (data) => {
                const added = await careService.addSpecialty(data);
                setSpecialties((items) => [...items, added]);
                setToast("Specialty added.");
              }}
              onToggle={async (specialty) => {
                try {
                  const updated = await careService.setSpecialtyActive(specialty.id, specialty.active === false);
                  setSpecialties((items) => items.map((item) => item.id === updated.id ? updated : item));
                  setToast(`${updated.name} ${updated.active === false ? "deactivated" : "activated"}${updated.simulated ? " (simulated)" : ""}.`);
                } catch (error) { setToast(error.message); }
              }}
            />
          )}
          {page === "availability" && (
            <AvailabilityPage
              doctors={doctors}
              admin
            />
          )}
          {page === "doctor-register" && (
            <DoctorAccess
              register
              onSuccess={(result) => {
                setUser(result.user);
                if (result.doctor)
                  setDoctors((list) => [result.doctor, ...list]);
                setToast("Registration submitted for verification.");
                navigate("doctor-dashboard");
              }}
            />
          )}
          {page === "doctor-login" && (
            <DoctorAccess
              onSuccess={(result) => {
                setUser(result.user);
                setToast(
                  serviceMode === "demo"
                    ? "Demo sign-in only; identity is not verified."
                    : "Signed in.",
                );
                navigate("doctor-dashboard");
              }}
            />
          )}
          {page === "doctor-dashboard" &&
            (user?.role === "doctor" ? (
              <DoctorPortal
                user={user}
                doctors={doctors}
                facilities={facilities}
                onLogout={async () => {
                  await careService.logout().catch(() => {});
                  setUser(null);
                  navigate("doctor-login");
                }}
                onDoctorUpdate={(updated) =>
                  setDoctors((list) =>
                    list.map((d) => (d.id === updated.id ? updated : d)),
                  )
                }
              />
            ) : (
              <PortalAccessNotice
                role="doctor"
                onLogin={() => navigate("doctor-login")}
              />
            ))}
          {page === "admin-login" && (
            <DoctorAccess
              onSuccess={(result) => {
                const identity = result.user;
                setUser(identity);
                if (identity.role !== "admin") {
                  setToast("This account is not an administrator.");
                  setUser(null);
                  return;
                }
                navigate("admin");
              }}
            />
          )}
        </main>
        <footer className="page-footer">
          <span>© 2026 Carewell Health</span>
          <span>Thoughtful care, closer to you</span>
          <a
            href="#assistance"
            onClick={(event) => {
              event.preventDefault();
              navigate("assistance");
            }}
          >
            Help &amp; support
          </a>
        </footer>
      </div>
      <MobileDrawer
        open={mobileNav}
        page={page}
        onClose={() => setMobileNav(false)}
        onNavigate={navigate}
      />
      <MobileQuickNav page={page} onNavigate={navigate} />
      {bookingDoctor && (
        <BookingDialog
          doctor={bookingDoctor}
          facilities={facilities}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          onClose={() => setBookingDoctor(null)}
          onSubmit={submitBooking}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

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

function AdminOverview({ onRoute }) {
  const max = Math.max(...adminSummary.monthlyAppointments);
  return (
    <>
      <SectionHeading
        eyebrow="THE CAREWELL PULSE"
        title={
          <>
            A calmer way to <em>care for care.</em>
          </>
        }
        description="A clear view of what’s happening across your health network today."
        action={
          <Pill tone="available">
            <i /> Systems operating normally
          </Pill>
        }
      />
      <div className="admin-stats">
        {[
          [
            "Appointments today",
            adminSummary.appointmentsToday,
            "+12% this week",
            CalendarDays,
          ],
          [
            "Verified doctors",
            adminSummary.totalDoctors,
            "Across 24 specialties",
            Stethoscope,
          ],
          [
            "Awaiting review",
            adminSummary.pendingDoctors,
            "Needs your attention",
            ShieldCheck,
          ],
          [
            "Active facilities",
            adminSummary.activeFacilities,
            "Across Dhaka",
            Hospital,
          ],
        ].map(([title, value, sub, Icon], i) => (
          <article className="metric-card surface" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
            <small className={i === 2 ? "warning-copy" : ""}>{sub}</small>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <section className="admin-panel surface">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">APPOINTMENT ACTIVITY</span>
              <h3>A steady rhythm of care.</h3>
            </div>
            <select aria-label="Chart period">
              <option>Last 12 months</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Completed visits
            </span>
            <strong>
              1,042 <small>+8.4%</small>
            </strong>
          </div>
          <div className="bar-chart" aria-label="Monthly appointments chart">
            {adminSummary.monthlyAppointments.map((value, index) => (
              <div key={index}>
                <i
                  style={{ height: `${(value / max) * 100}%` }}
                  title={`${value} appointments`}
                />
                <small>
                  {
                    [
                      "N",
                      "D",
                      "J",
                      "F",
                      "M",
                      "A",
                      "M",
                      "J",
                      "J",
                      "A",
                      "S",
                      "O",
                    ][index]
                  }
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel surface">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEEDS YOUR EYE</span>
              <h3>For review.</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onRoute("verification")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {["Dr. Mahmud Hasan", "Dr. Nadia Karim", "Dr. Saif Uddin"].map(
            (name, i) => (
              <div className="review-queue" key={name}>
                <span className="review-avatar">{name.split(" ")[1][0]}</span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {["Neurology", "Gynecology", "Cardiology"][i]} · Submitted{" "}
                    {i + 1}d ago
                  </small>
                </span>
                <Pill tone="pending">Pending</Pill>
              </div>
            ),
          )}
          <Button variant="outline" onClick={() => onRoute("verification")}>
            Review all applications <ArrowRight size={14} />
          </Button>
        </section>
      </div>
      <div className="admin-shortcuts">
        <span className="eyebrow">QUICK ACTIONS</span>
        <div>
          {[
            ["admin-doctors", "Doctor management", Stethoscope],
            ["verification", "Verification review", ShieldCheck],
            ["admin-facilities", "Facility management", Hospital],
            ["admin-appointments", "Appointment management", CalendarDays],
            ["specialties", "Manage specialties", ListFilter],
            ["availability", "Update availability", Clock3],
          ].map(([to, label, Icon]) => (
            <button key={to} onClick={() => onRoute(to)}>
              <Icon size={17} />
              <span>{label}</span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function DoctorManagement({ doctors, facilities, onAdd, onVerify, onUpdate, onDeactivate, onPublicationChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const list = doctors.filter((d) =>
    `${d.name} ${d.specialty}`.toLowerCase().includes(query.toLowerCase()),
  );
  const submit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name").trim();
    const fee = Number(data.get("fee"));
    const specialty = data.get("specialty");
    const specialtyId = {
      Cardiologist: "cardiology",
      Dermatologist: "dermatology",
      Pediatrician: "pediatrics",
      "Dental Surgeon": "dentistry",
      Neurologist: "neurology",
      Gynecologist: "gynecology",
    }[specialty];
    if (name.length < 5 || !Number.isFinite(fee) || fee < 0) { setError("Enter a valid name and non-negative consultation fee."); return; }
    const profile = {
      name,
      specialtyId,
      specialty,
      image:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=80",
      qualifications: data
        .get("qualifications")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      experienceYears: Number(data.get("experienceYears")),
      languages: ["Bangla", "English"],
      fee,
      location: data.get("location"),
      facilityIds: data.getAll("facilityIds"),
    };
    try {
      if (editing) await onUpdate(editing, profile);
      else await onAdd(profile);
      setShowForm(false);
      setEditing(null);
      setError("");
    } catch (err) { setError(err.message || "Doctor profile could not be saved."); }
  };
  return (
    <>
      <SectionHeading
        eyebrow="THE PEOPLE BEHIND GREAT CARE"
        title={
          <>
            Doctor <em>management.</em>
          </>
        }
        description="Thoughtfully manage professional profiles and their visibility."
        action={
          <Button onClick={() => { setEditing(null); setError(""); setShowForm(!showForm); }}>
            <Plus size={15} /> Add doctor
          </Button>
        }
      />
      {showForm && (
        <form className="admin-form surface" onSubmit={submit}>
          <div className="panel-heading">
            <h3>{editing ? `Edit ${editing.name}` : "Add a doctor profile"}</h3>
            <button type="button" onClick={() => setShowForm(false)}>
              <X size={17} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Doctor name
              <input
                name="name"
                required
                minLength="5"
                placeholder="Dr. First Last"
                defaultValue={editing?.name || ""}
              />
            </label>
            <label>
              Specialty
              <select name="specialty" defaultValue={editing?.specialty || "Cardiologist"}>
                <option>Cardiologist</option>
                <option>Dermatologist</option>
                <option>Pediatrician</option>
                <option>Dental Surgeon</option>
                <option>Neurologist</option>
                <option>Gynecologist</option>
              </select>
            </label>
            <label>
              Qualifications
              <input name="qualifications" required placeholder="MBBS, FCPS" defaultValue={editing?.qualifications?.join(", ") || ""} />
            </label>
            <label>
              Experience (years)
              <input
                name="experienceYears"
                required
                type="number"
                min="0"
                max="60"
                defaultValue={editing?.experienceYears || 0}
              />
            </label>
            <label>
              Consultation fee (৳)
              <input name="fee" required type="number" min="0" defaultValue={editing?.fee || 0} />
            </label>
            <label>
              Location
              <input name="location" required placeholder="Dhanmondi, Dhaka" defaultValue={editing?.location || ""} />
            </label>
          </div>
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Update profile" : "Save profile"} <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      )}
      <div className="table-toolbar surface">
        <div>
          <Search size={16} />
          <input
            placeholder="Search doctors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Pill>{list.length} profiles</Pill>
      </div>
      <div className="table-wrap surface">
        <table>
          <thead>
            <tr>
              <th>DOCTOR</th>
              <th>SPECIALTY</th>
              <th>LOCATION</th>
              <th>FEE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {list.map((doctor) => (
              <tr key={doctor.id}>
                <td>
                  <div className="table-person">
                    <img src={doctor.image} alt="" />
                    <span>
                      <strong>{doctor.name}</strong>
                      <small>{doctor.qualifications.join(", ")}</small>
                    </span>
                  </div>
                </td>
                <td>{doctor.specialty}</td>
                <td>{doctor.location}</td>
                <td>৳{doctor.fee.toLocaleString()}</td>
                <td>
                  <Pill tone={doctor.verificationStatus === "verified" ? "verified" : "pending"}>
                    {doctor.verificationStatus || "Verification unavailable"} · {doctor.publicationStatus || "publication status unavailable"}
                  </Pill>
                </td>
                <td>
                  <button className="table-action" onClick={() => { setEditing(doctor); setShowForm(true); }}>Edit</button>
                  {doctor.verificationStatus === "pending" && <button className="table-action" onClick={() => onVerify(doctor, "verified")}>Approve</button>}
                  {doctor.verificationStatus === "verified" && <button className="table-action" onClick={() => onVerify(doctor, "suspended")}>Suspend verification</button>}
                  {doctor.verificationStatus === "verified" && <button className="table-action" onClick={() => onPublicationChange(doctor, doctor.publicationStatus === "published" ? "unpublished" : "published")}>{doctor.publicationStatus === "published" ? "Unpublish" : "Publish"}</button>}
                  {!doctor.accountStatus || doctor.accountStatus === "active" ? <button className="table-action" onClick={() => onDeactivate(doctor)}>Deactivate</button> : <span>{doctor.accountStatus}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="table-empty">
            No doctor profiles match your search.
          </div>
        )}
      </div>
    </>
  );
}

function VerificationPage({ doctors, onVerify }) {
  const [selected, setSelected] = useState("all");
  const list = doctors.filter(
    (d) =>
      selected === "all" ||
      (selected === "pending"
        ? d.verificationStatus === "pending"
        : d.verificationStatus !== "pending"),
  );
  return (
    <>
      <SectionHeading
        eyebrow="A LITTLE CARE GOES A LONG WAY"
        title={
          <>
            Review with <em>confidence.</em>
          </>
        }
        description="Review professional information submitted to Carewell before it’s visible to patients."
      />
      <div className="verification-banner">
        <span>
          <ShieldCheck size={20} />
        </span>
        <p>
          Platform verification means professional information has been reviewed
          according to Carewell’s process. It does not imply government
          certification.
        </p>
      </div>
      <div className="appointment-tabs">
        {[
          ["all", "All applications"],
          ["pending", "Needs review"],
          ["verified", "Reviewed"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={selected === key ? "active" : ""}
            onClick={() => setSelected(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="verification-list">
        {list.map((doctor) => (
          <article key={doctor.id} className="verification-card surface">
            <img src={doctor.image} alt="" />
            <div>
              <span className="eyebrow">
                PROFESSIONAL PROFILE · {doctor.id.toUpperCase()}
              </span>
              <h3>{doctor.name}</h3>
              <p>
                {doctor.specialty} · {doctor.experienceYears} years ·{" "}
                {doctor.qualifications.join(", ")}
              </p>
              <span className="verification-doc">
                {doctor.certificateFiles?.length ? `${doctor.certificateFiles.length} certificate file(s) supplied` : "Certificate metadata has not been supplied by the service."}
              </span>
            </div>
            <Pill
              tone={
                doctor.verificationStatus === "verified"
                  ? "verified"
                  : doctor.verificationStatus === "rejected"
                    ? "error"
                    : "pending"
              }
            >
              {doctor.verificationStatus === "verified"
                ? "Reviewed"
                : doctor.verificationStatus === "rejected"
                  ? "Changes requested"
                  : "Needs review"}
            </Pill>
            <div className="verification-actions">
              {doctor.verificationStatus === "pending" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onVerify(doctor, "rejected")}
                  >
                    Request changes
                  </Button>
                  <Button onClick={() => onVerify(doctor, "verified")}>
                    <Check size={15} /> Approve
                  </Button>
                </>
              ) : doctor.verificationStatus === "verified" ? <Button variant="outline" onClick={() => onVerify(doctor, "suspended")}>Suspend verification</Button> : doctor.verificationStatus === "suspended" ? <Button onClick={() => onVerify(doctor, "verified")}>Restore verification</Button> : <Button variant="outline" onClick={() => onVerify(doctor, "pending")}>Reopen review</Button>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function SpecialtiesPage({ specialties, onAdd, onToggle }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const add = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name").trim();
    if (
      name.length < 3 ||
      specialties.some((s) => s.name.toLowerCase() === name.toLowerCase())
    ) {
      setError("Enter a unique specialty name with at least 3 characters.");
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await onAdd({ name, slug, description: data.get("description") });
    setShowForm(false);
    setError("");
  };
  return (
    <>
      <SectionHeading
        eyebrow="CARE, ORGANIZED THOUGHTFULLY"
        title={
          <>
            Specialties, made <em>clear.</em>
          </>
        }
        description="Help patients find the right kind of care, without the guesswork."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> Add specialty
          </Button>
        }
      />
      {showForm && (
        <form className="inline-add-form surface" onSubmit={add}>
          <label>
            Specialty name
            <input name="name" required placeholder="e.g. Endocrinology" />
          </label>
          <label>
            Short description
            <input
              name="description"
              required
              placeholder="e.g. Hormones & metabolism"
            />
          </label>
          <Button>
            Add to directory <ArrowRight size={14} />
          </Button>
          {error && <span className="form-error">{error}</span>}
        </form>
      )}
      <div className="specialty-grid">
        {specialties.map((specialty, index) => (
          <article className="specialty-card surface" key={specialty.id}>
            <span className={`specialty-icon specialty-icon-${index % 4}`}>
              <Stethoscope size={19} />
            </span>
            <div>
              <h3>{specialty.name}</h3>
              <p>{specialty.description}</p>
            </div>
            <Pill tone={specialty.active === false ? "neutral" : "verified"}>{specialty.active === false ? "Inactive" : "Active"}</Pill>
            <Button type="button" variant="outline" onClick={() => onToggle(specialty)}>{specialty.active === false ? "Activate" : "Deactivate"}</Button>
          </article>
        ))}
      </div>
      <div className="empty-admin surface">
        <Sparkles size={18} />
        <span>
          <strong>Thoughtfully curated</strong>
          <small>
            Every specialty is reviewed to help patients navigate care
            confidently.
          </small>
        </span>
        <Pill tone="verified">
          <Check size={12} /> Active
        </Pill>
      </div>
    </>
  );
}

function AvailabilityPage({ doctors, admin = false }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [slots, setSlots] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const doctor = doctors.find((item) => item.id === doctorId);
  useEffect(() => {
    if (!doctorId) return;
    careService.listAvailability(doctorId, admin).then(setSlots).catch((err) => setError(err.message));
  }, [doctorId, admin]);
  const save = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.startTime >= data.endTime) { setError("End time must be after start time."); return; }
    if (data.date < localDateKey()) { setError("Past availability dates cannot be saved."); return; }
    setError("");
    try {
      const payload = { ...data, status: editing?.status || "available" };
      const saved = editing
        ? await careService.updateAvailability(editing.id, payload, admin)
        : await careService.saveAvailability(doctorId, payload, admin);
      setSlots((items) => [...items.filter((item) => item.id !== saved.id), saved]);
      setEditing(null);
      setNotice(`Slot ${editing ? "updated" : "created"}${saved.simulated ? " (simulated)" : ""}.`);
      form.reset();
    } catch (err) { setError(err.message || "Availability could not be saved."); }
  };
  const toggleBlocked = async (slot) => {
    setError("");
    try {
      const updated = await careService.updateAvailability(slot.id, { ...slot, status: slot.status === "unavailable" ? "available" : "unavailable" }, admin);
      setSlots((items) => items.map((item) => item.id === slot.id ? updated : item));
      setNotice(`Slot marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    } catch (err) { setError(err.message); }
  };
  const remove = async (slot) => {
    if (!window.confirm(`Remove ${slot.date} ${slot.startTime}–${slot.endTime}?`)) return;
    try {
      const result = await careService.removeAvailability(slot.id, admin);
      setSlots((items) => items.filter((item) => item.id !== slot.id));
      setNotice(`Slot removed${result?.simulated ? " (simulated)" : ""}.`);
    } catch (err) { setError(err.message); }
  };
  return <>
    <SectionHeading eyebrow={admin ? "ADMINISTRATION" : "YOUR PRACTICE"} title={<>Availability <em>management.</em></>} description={admin ? "Configure a doctor’s clinic schedule. Backend access controls remain authoritative." : "Create, update, block, and remove your appointment slots."} />
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="privacy-note" role="status">{notice}</p>}
    <div className="availability-layout">
      <aside className="availability-doctors surface"><span className="eyebrow">CHOOSE A DOCTOR</span>{doctors.map((item) => <button type="button" key={item.id} className={doctorId === item.id ? "active" : ""} onClick={() => setDoctorId(item.id)}><img src={item.image} alt=""/><span><strong>{item.name}</strong><small>{item.specialty}</small></span></button>)}</aside>
      <section className="availability-editor surface"><div className="panel-heading"><div><span className="eyebrow">{admin ? "ADMIN SCHEDULE" : "DOCTOR SCHEDULE"}</span><h3>{doctor?.name || "No doctor selected"}</h3></div></div>
        {!doctor && <div className="table-empty">No doctor profiles are available.</div>}
        {doctor && <form key={editing?.id || "new-slot"} className="inline-add-form" onSubmit={save}>
          <label>Clinic<select name="facilityId" defaultValue={editing?.facilityId || doctor.facilityIds?.[0] || ""} required>{doctor.facilityIds?.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
          <label>Date<input type="date" name="date" min={localDateKey()} defaultValue={editing?.date || ""} required /></label>
          <label>Start<input type="time" name="startTime" defaultValue={editing?.startTime || ""} required /></label>
          <label>End<input type="time" name="endTime" defaultValue={editing?.endTime || ""} required /></label>
          <Button type="submit"><Check size={14}/>{editing ? "Save changes" : "Create slot"}</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Stop editing</Button>}
        </form>}
        <div className="table-wrap"><table><thead><tr><th>DATE</th><th>CLINIC</th><th>TIME</th><th>STATE</th><th>ACTIONS</th></tr></thead><tbody>{slots.map((slot) => <tr key={slot.id}><td>{slot.date}</td><td>{slot.facilityId}</td><td>{slot.startTime}–{slot.endTime}</td><td>{slot.status}{slot.simulated ? " · simulated" : ""}</td><td><button className="table-action" onClick={() => setEditing(slot)}>Edit</button><button className="table-action" onClick={() => toggleBlocked(slot)}>{slot.status === "unavailable" ? "Unblock" : "Block"}</button><button className="table-action" onClick={() => remove(slot)}>Remove</button></td></tr>)}</tbody></table>{!slots.length && <div className="table-empty">No availability entries.</div>}</div>
      </section>
    </div>
  </>;
}

function FacilityManagement({ facilities, onSave, onDeactivate }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const list = facilities.filter((item) =>
    `${item.name} ${item.area}`.toLowerCase().includes(query.toLowerCase()),
  );
  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get("name").trim();
    const address = data.get("address").trim();
    if (name.length < 4 || address.length < 5) return;
    await onSave(editing?.id, {
      name,
      type: data.get("type"),
      address,
      area: data.get("area").trim(),
      city: "Dhaka",
      phone: data.get("phone").trim(),
    });
    setShowForm(false);
    setEditing(null);
  };
  const editFacility = (facility) => {
    setEditing(facility);
    setShowForm(true);
  };
  return (
    <>
      <SectionHeading
        eyebrow="PLACES THAT MAKE CARE POSSIBLE"
        title={
          <>
            Facility <em>management.</em>
          </>
        }
        description="Keep clinic and hospital information clear, current, and easy to find."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm((value) => !value);
            }}
          >
            <Plus size={15} /> Add facility
          </Button>
        }
      />
      {showForm && (
        <form className="admin-form surface" onSubmit={submit}>
          <div className="panel-heading">
            <h3>{editing ? "Edit facility details" : "Add a facility"}</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Facility name
              <input
                name="name"
                required
                minLength="4"
                defaultValue={editing?.name || ""}
                placeholder="Clinic or hospital name"
              />
            </label>
            <label>
              Facility type
              <select name="type" defaultValue={editing?.type || "clinic"}>
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
              </select>
            </label>
            <label>
              Street address
              <input
                name="address"
                required
                minLength="5"
                defaultValue={editing?.address || ""}
                placeholder="House, road, block"
              />
            </label>
            <label>
              Area
              <input
                name="area"
                required
                defaultValue={editing?.area || ""}
                placeholder="Dhanmondi"
              />
            </label>
            <label>
              Contact phone
              <input
                name="phone"
                required
                type="tel"
                pattern="\+?[0-9\s-]{8,18}"
                defaultValue={editing?.phone || ""}
                placeholder="+880 2 XXXX XXXX"
              />
            </label>
          <label>
            Associated clinics and hospitals (Ctrl/Cmd-click for multiple)
            <select name="facilityIds" multiple required defaultValue={editing?.facilityIds || []}>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.area}</option>)}
            </select>
          </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Save changes" : "Save facility"}{" "}
              <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      )}
      <div className="table-toolbar surface">
        <div>
          <Search size={16} />
          <input
            placeholder="Search facilities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Pill>{list.length} facilities</Pill>
      </div>
      <div className="facility-grid">
        {list.map((facility) => (
          <article className="facility-card surface" key={facility.id}>
            <div className="facility-image">
              <img src={facility.image} alt="" />
              <Pill>{facility.type}</Pill>
            </div>
            <div className="facility-body">
              <h3>{facility.name}</h3>
              <p>
                <MapPin size={14} /> {facility.address}, {facility.area},{" "}
                {facility.city}
              </p>
              <span className="facility-phone">{facility.phone}</span>
              <div className="facility-footer">
                <span>
                  {facility.active === false ? "Inactive" : <><CheckCircle2 size={14} /> Visible in discovery</>}
                </span>
                <Button
                  variant="outline"
                  onClick={() => editFacility(facility)}
                >
                  Edit details
                </Button>
                {facility.active !== false && <Button variant="outline" onClick={() => onDeactivate(facility)}>Deactivate</Button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AppointmentManagement({
  appointments,
  doctors,
  facilities,
  onStatus,
}) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const list = appointments.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.patientName} ${doctors.find((d) => d.id === item.doctorId)?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <SectionHeading
        eyebrow="A CLEAR VIEW OF EVERY VISIT"
        title={
          <>
            Appointment <em>management.</em>
          </>
        }
        description="Keep patient visits organized and make status updates with care."
        action={
          <Pill tone="available">
            <i />{" "}
            {
              appointments.filter((item) =>
                ["confirmed", "upcoming"].includes(item.status),
              ).length
            }{" "}
            upcoming
          </Pill>
        }
      />
      <div className="results-toolbar admin-appointment-toolbar">
        <span>Manage visit requests and appointment status.</span>
        <label>
          Show{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <div className="table-toolbar surface">
        <div>
          <Search size={16} />
          <input
            placeholder="Search patient or doctor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Pill>{list.length} appointments</Pill>
      </div>
      <div className="table-wrap surface">
        <table>
          <thead>
            <tr>
              <th>PATIENT</th>
              <th>DOCTOR</th>
              <th>FACILITY</th>
              <th>DATE &amp; TIME</th>
              <th>STATUS</th>
              <th>UPDATE</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => {
              const doctor = doctors.find((d) => d.id === item.doctorId);
              const facility = facilities.find((f) => f.id === item.facilityId);
              return (
                <tr key={item.id}>
                  <td>
                    <div className="table-person">
                      <span className="review-avatar">
                        {item.patientName.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{item.patientName}</strong>
                        <small>{item.phone}</small>
                      </span>
                    </div>
                  </td>
                  <td>{doctor?.name || "Doctor"}</td>
                  <td>{facility?.name || "Carewell clinic"}</td>
                  <td>
                    {item.date} · {item.time}
                  </td>
                  <td>
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
                  </td>
                  <td>
                    <select
                      aria-label={`Update ${item.patientName} appointment`}
                      value={item.status}
                      onChange={(e) => onStatus(item.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && (
          <div className="table-empty">
            No appointments match those filters.
          </div>
        )}
      </div>
    </>
  );
}

function BookingDialog({
  doctor,
  facilities,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  onClose,
  onSubmit,
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [clinicId, setClinicId] = useState(doctor.facilityIds[0]);
  const clinicOptions = facilities.filter((facility) =>
    doctor.facilityIds.includes(facility.id),
  );
  const clinic = clinicOptions.find((item) => item.id === clinicId);
  const clinicFee = clinic ? doctor.feesByFacility?.[clinic.id] ?? doctor.fee : doctor.fee;
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !selectedDate ||
      selectedDate < localDateKey()
    ) {
      setError("Choose a valid date that is today or later.");
      return;
    }
    onSubmit(event, {
      clinicId,
      date: selectedDate,
      selectedDate,
      selectedTime,
    });
  };
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      key: localDateKey(date),
      day: date.toLocaleDateString("en", { weekday: "short" }),
      date: date.toLocaleDateString("en", { day: "2-digit" }),
    };
  });
  const times = ["4:30 PM", "5:30 PM", "6:00 PM", "6:30 PM"];
  return (
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="booking-dialog surface"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <div className="dialog-header">
          <span className="eyebrow">LET’S MAKE THIS HAPPEN</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
          >
            <X size={19} />
          </button>
        </div>
        <div className="dialog-progress">
          {["Doctor", "Clinic", "Date & time", "Details"].map((label, i) => (
            <span className={step >= i + 1 ? "active" : ""} key={label}>
              <i>{step > i + 1 ? <Check size={12} /> : `0${i + 1}`}</i>
              <small>{label}</small>
              {i < 3 && <b />}
            </span>
          ))}
        </div>
        {step === 1 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              A good first step
              <br />
              <em>starts with trust.</em>
            </h2>
            <p className="dialog-doctor">Your selected doctor</p>
            <div className="booking-clinic">
              <img
                className="appointment-doctor-image"
                src={doctor.image}
                alt=""
              />
              <span>
                <strong>{doctor.name}</strong>
                <small>
                  {doctor.specialty} · {doctor.experienceYears} years ·{" "}
                  {doctor.qualifications.join(", ")}
                </small>
              </span>
              {doctor.verificationStatus === "verified" && (
                <Pill tone="verified">
                  <Check size={12} /> Verified
                </Pill>
              )}
            </div>
            <p className="privacy-note">
              Availability is simulated in this MVP; request is not a confirmed
              appointment.
            </p>
          </div>
        )}
        {step === 2 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              Choose a place
              <br />
              <em>that feels right.</em>
            </h2>
            <p className="dialog-doctor">Appointment with {doctor.name}</p>
            <div className="booking-clinic">
              <MapPin size={18} />
              <span>
                <strong>{clinic?.name || "Choose a clinic"}</strong>
                <small>
                  {clinic
                    ? `${clinic.address}, ${clinic.area}, ${clinic.city}`
                    : "Select a clinic to continue"}
                </small>
              </span>
            </div>
            <label className="filter-label">
              Available clinics
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
              >
                {clinicOptions.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              Pick a day that
              <br />
              <em>works for you.</em>
            </h2>
            <p className="dialog-doctor">
              Simulated availability · All times in BST (UTC+6)
            </p>
            <div className="date-list">
              {dates.map(({ key, day, date }) => (
                <button
                  type="button"
                  key={key}
                  className={selectedDate === key ? "date-selected" : ""}
                  onClick={() => setSelectedDate(key)}
                >
                  <small>{day}</small>
                  <strong>{date}</strong>
                </button>
              ))}
            </div>
            <div className="time-list">
              {times.map((time) => (
                <button
                  type="button"
                  key={time}
                  disabled={time === "6:30 PM"}
                  className={`${selectedTime === time ? "time-selected" : ""} ${time === "6:30 PM" ? "time-disabled" : ""}`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                  {selectedTime === time && <Check size={13} />}
                  {time === "6:30 PM" && <small>Booked</small>}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              A few details,
              <br />
              <em>then you’re set.</em>
            </h2>
            <p className="dialog-doctor">
              {doctor.name} · {clinic?.name} · {selectedDate} at {selectedTime}
            </p>
            <div className="patient-form-grid">
              <label>
                Patient name
                <input
                  name="patientName"
                  required
                  minLength="2"
                  placeholder="Your full name"
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  required
                  pattern="\+?[0-9\s-]{8,18}"
                  placeholder="+880 1XXX XXXXXX"
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Reason for visit
                <textarea
                  name="reason"
                  required
                  minLength="5"
                  placeholder="A brief note to help your doctor prepare"
                />
              </label>
            </div>
            {error && <span className="form-error">{error}</span>}
            <p className="privacy-note">
              <ShieldCheck size={14} /> Your details are only used to prepare
              this appointment.
            </p>
          </div>
        )}
        <div className="dialog-footer">
          <span>
            <small>CONSULTATION FEE</small>
            <strong>৳{clinicFee.toLocaleString()}</strong>
          </span>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => current - 1)}
            >
              <ArrowLeft size={14} /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 3 && (!selectedDate || !selectedTime)) {
                  setError("Choose a date and time to continue.");
                  return;
                }
                if (step === 2 && !clinicId) {
                  setError("Please choose a clinic to continue.");
                  return;
                }
                setError("");
                setStep((current) => current + 1);
              }}
            >
              {step === 1
                ? "Choose a clinic"
                : step === 2
                  ? "Choose date & time"
                  : "Continue"}{" "}
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button type="submit">
              Request appointment <Check size={15} />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default App;
