import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Menu,
  MessageCircle,
  Moon,
  Sun,
} from "lucide-react";
import { careService, serviceMode } from "./data/careService.js";
import BookingDialog from "./components/BookingDialog.jsx";
import {
  AccountMenu,
  MobileDrawer,
  MobileQuickNav,
  routeTitle,
  routes,
} from "./components/navigation.jsx";
import { IconButton } from "./components/ui.jsx";
import {
  AdminOverview,
  AppointmentManagement,
  AvailabilityPage,
  DoctorManagement,
  FacilityManagement,
  SpecialtiesPage,
  VerificationPage,
} from "./pages/AdminPages.jsx";
import {
  AppointmentsPage,
  AssistancePage,
  DirectoryPage,
  DiscoverPage,
  FacilitiesPage,
  MessagesPage,
  ProfilePage,
} from "./pages/PatientPages.jsx";
import {
  DoctorAccess,
  DoctorPortal,
  PortalAccessNotice,
} from "./pages/PortalPages.jsx";

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
            <AccountMenu
              user={user}
              doctor={user?.doctorId ? doctors.find((item) => item.id === user.doctorId) : null}
              onNavigate={navigate}
              onLogout={async () => {
                try {
                  await careService.logout();
                } catch (error) {
                  setToast(error.message);
                }
                setUser(null);
                navigate("discover");
              }}
            />
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


export default App;
