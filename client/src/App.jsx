import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import RequireRole from "./components/RequireRole.jsx";
import { PATHS, ROLES } from "./constants.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";
import { CatalogProvider } from "./context/CatalogContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { RealtimeProvider } from "./context/RealtimeContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import DoctorRegisterPage from "./pages/auth/DoctorRegisterPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import SignUpPage from "./pages/auth/SignUpPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AppointmentsPage from "./pages/patient/AppointmentsPage.jsx";
import ProfilePage from "./pages/patient/ProfilePage.jsx";
import AssistancePage from "./pages/public/AssistancePage.jsx";
import DirectoryPage from "./pages/public/DirectoryPage.jsx";
import DiscoverPage from "./pages/public/DiscoverPage.jsx";
import DoctorProfilePage from "./pages/public/DoctorProfilePage.jsx";
import FacilitiesPage from "./pages/public/FacilitiesPage.jsx";

// Role-restricted areas are split into separate bundles: patients never download them.
const DoctorDashboardPage = lazy(() => import("./pages/doctor/DoctorDashboardPage.jsx"));
const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage.jsx"));
const DoctorManagementPage = lazy(() => import("./pages/admin/DoctorManagementPage.jsx"));
const VerificationPage = lazy(() => import("./pages/admin/VerificationPage.jsx"));
const FacilityManagementPage = lazy(() => import("./pages/admin/FacilityManagementPage.jsx"));
const AppointmentManagementPage = lazy(() => import("./pages/admin/AppointmentManagementPage.jsx"));
const PatientManagementPage = lazy(() => import("./pages/admin/PatientManagementPage.jsx"));
const ReviewModerationPage = lazy(() => import("./pages/admin/ReviewModerationPage.jsx"));
const SpecialtiesPage = lazy(() => import("./pages/admin/SpecialtiesPage.jsx"));
const AdminAvailabilityPage = lazy(() => import("./pages/admin/AdminAvailabilityPage.jsx"));
const SupportRequestsPage = lazy(() => import("./pages/admin/SupportRequestsPage.jsx"));
const DeactivationRequestsPage = lazy(() => import("./pages/admin/DeactivationRequestsPage.jsx"));

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
          <Route path={PATHS.adminPatients} element={<PatientManagementPage />} />
          <Route path={PATHS.adminReviews} element={<ReviewModerationPage />} />
          <Route path={PATHS.adminSpecialties} element={<SpecialtiesPage />} />
          <Route path={PATHS.adminAvailability} element={<AdminAvailabilityPage />} />
          <Route path={PATHS.adminSupport} element={<SupportRequestsPage />} />
          <Route path={PATHS.adminDeactivationRequests} element={<DeactivationRequestsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** Every app-wide provider, in dependency order. Must be rendered inside a Router. */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <RealtimeProvider>
              <CatalogProvider>
                <LanguageProvider>
                  <FavoritesProvider>
                    <BookingProvider>{children}</BookingProvider>
                  </FavoritesProvider>
                </LanguageProvider>
              </CatalogProvider>
            </RealtimeProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
