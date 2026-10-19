import { lazy } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/Layout.jsx";
import { EmptyState, PageLoader } from "./components/ui.jsx";
import { PATHS, ROLES } from "./constants.js";
import {
  AuthProvider,
  CatalogProvider,
  ConfirmProvider,
  ThemeProvider,
  ToastProvider,
  useAuth,
} from "./context.jsx";
import ProfilePage from "./features/account/ProfilePage.jsx";
import AppointmentsPage from "./features/appointments/AppointmentsPage.jsx";
import DoctorRegisterPage from "./features/auth/DoctorRegisterPage.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import { ForgotPasswordPage, ResetPasswordPage } from "./features/auth/PasswordResetPages.jsx";
import SignUpPage from "./features/auth/SignUpPage.jsx";
import VerifyEmailPage from "./features/auth/VerifyEmailPage.jsx";
import { BookingProvider } from "./features/booking/Booking.jsx";
import DirectoryPage from "./features/discovery/DirectoryPage.jsx";
import DiscoverPage from "./features/discovery/DiscoverPage.jsx";
import DoctorProfilePage from "./features/discovery/DoctorProfilePage.jsx";
import FacilitiesPage from "./features/discovery/FacilitiesPage.jsx";
import MessagesPage from "./features/messaging/MessagesPage.jsx";
import AssistancePage from "./features/support/AssistancePage.jsx";

// ─── App ───────────────────────────────────────────────────────────────────────────────────

// Role-restricted areas are split into separate bundles: patients never download them.
const DoctorDashboardPage = lazy(() => import("./features/doctor-portal/DoctorDashboardPage.jsx"));
const AdminOverviewPage = lazy(() => import("./features/admin/AdminOverviewPage.jsx"));
const DoctorManagementPage = lazy(() => import("./features/admin/DoctorManagementPage.jsx"));
const VerificationPage = lazy(() => import("./features/admin/VerificationPage.jsx"));
const FacilityManagementPage = lazy(() => import("./features/admin/FacilityManagementPage.jsx"));
const AppointmentManagementPage = lazy(() => import("./features/admin/AppointmentManagementPage.jsx"));
const SpecialtiesPage = lazy(() => import("./features/admin/SpecialtiesPage.jsx"));
const AdminAvailabilityPage = lazy(() =>
  import("./features/availability/Availability.jsx").then((module) => ({
    default: module.AdminAvailabilityPage,
  })),
);

/** The route table. Add new screens here. */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={PATHS.discover} replace />} />

        {/* Public: anyone can browse */}
        <Route path={PATHS.discover} element={<DiscoverPage />} />
        <Route path={PATHS.doctors} element={<DirectoryPage />} />
        <Route path="/doctors/:doctorId" element={<DoctorProfilePage />} />
        <Route path={PATHS.facilities} element={<FacilitiesPage />} />
        <Route path={PATHS.assistance} element={<AssistancePage />} />

        {/* Patient accounts */}
        <Route path={PATHS.login} element={<LoginPage portal={ROLES.PATIENT} />} />
        <Route path={PATHS.signup} element={<SignUpPage />} />
        <Route path={PATHS.verifyEmail} element={<VerifyEmailPage />} />
        <Route path={PATHS.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={PATHS.resetPassword} element={<ResetPasswordPage />} />
        <Route element={<RequireRole role={ROLES.PATIENT} />}>
          <Route path={PATHS.appointments} element={<AppointmentsPage />} />
          <Route path={PATHS.profile} element={<ProfilePage />} />
        </Route>
        {/* Messaging is shared by patients, doctors (with administration) and admins */}
        <Route element={<RequireRole roles={[ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN]} />}>
          <Route path={PATHS.messages} element={<MessagesPage />} />
        </Route>

        {/* Doctors */}
        <Route path={PATHS.doctorLogin} element={<LoginPage portal={ROLES.DOCTOR} />} />
        <Route path={PATHS.doctorRegister} element={<DoctorRegisterPage />} />
        <Route element={<RequireRole role={ROLES.DOCTOR} />}>
          <Route path={PATHS.doctorDashboard} element={<DoctorDashboardPage />} />
        </Route>

        {/* Administrators */}
        <Route path={PATHS.adminLogin} element={<LoginPage portal={ROLES.ADMIN} />} />
        <Route element={<RequireRole role={ROLES.ADMIN} />}>
          <Route path={PATHS.admin} element={<AdminOverviewPage />} />
          <Route path={PATHS.adminDoctors} element={<DoctorManagementPage />} />
          <Route path={PATHS.adminVerification} element={<VerificationPage />} />
          <Route path={PATHS.adminFacilities} element={<FacilityManagementPage />} />
          <Route path={PATHS.adminAppointments} element={<AppointmentManagementPage />} />
          <Route path={PATHS.adminSpecialties} element={<SpecialtiesPage />} />
          <Route path={PATHS.adminAvailability} element={<AdminAvailabilityPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

// ─── AppProviders ──────────────────────────────────────────────────────────────────────────

/** Every app-wide provider, in dependency order. Must be rendered inside a Router. */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <CatalogProvider>
              <BookingProvider>{children}</BookingProvider>
            </CatalogProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// ─── NotFoundPage ──────────────────────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you’re looking for doesn’t exist or has moved."
      action={
        <Link className="button button-primary" to={PATHS.discover}>
          Back to home
        </Link>
      }
    />
  );
}

// ─── RequireRole ───────────────────────────────────────────────────────────────────────────

const LOGIN_PATH = {
  [ROLES.DOCTOR]: PATHS.doctorLogin,
  [ROLES.ADMIN]: PATHS.adminLogin,
};

/**
 * Route guard. Renders nested routes only for the given role(s); otherwise it
 * redirects to a sign-in page and remembers where the visitor was going so they
 * return there afterwards. Patients must also have verified their email.
 *
 * This is a UX convenience. The API must enforce authorisation on every request.
 *
 * @param {{role?: string, roles?: string[]}} props  Allowed role(s).
 */
function RequireRole({ role, roles = [role] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Checking your session…" />;
  if (!user || !roles.includes(user.role)) {
    const target = roles.length === 1 ? (LOGIN_PATH[roles[0]] ?? PATHS.login) : PATHS.login;
    return <Navigate to={target} replace state={{ from: location, reason: "protected" }} />;
  }
  if (user.role === ROLES.PATIENT && !user.emailVerified)
    return <Navigate to={PATHS.verifyEmail} replace state={{ from: location }} />;
  return <Outlet />;
}
