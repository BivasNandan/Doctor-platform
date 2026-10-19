import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PATHS } from "../constants/paths.js";
import { ROLES } from "../constants/roles.js";
import AppShell from "../components/layout/AppShell.jsx";
import RequireRole from "../features/auth/RequireRole.jsx";
import DoctorRegisterPage from "../features/auth/pages/DoctorRegisterPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage.jsx";
import SignUpPage from "../features/auth/pages/SignUpPage.jsx";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage.jsx";
import ProfilePage from "../features/account/pages/ProfilePage.jsx";
import AppointmentsPage from "../features/appointments/pages/AppointmentsPage.jsx";
import DirectoryPage from "../features/discovery/pages/DirectoryPage.jsx";
import DiscoverPage from "../features/discovery/pages/DiscoverPage.jsx";
import DoctorProfilePage from "../features/discovery/pages/DoctorProfilePage.jsx";
import FacilitiesPage from "../features/discovery/pages/FacilitiesPage.jsx";
import MessagesPage from "../features/messaging/pages/MessagesPage.jsx";
import AssistancePage from "../features/support/pages/AssistancePage.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

// Role-restricted areas are split into separate bundles: patients never download them.
const DoctorDashboardPage = lazy(() => import("../features/doctor-portal/pages/DoctorDashboardPage.jsx"));
const AdminOverviewPage = lazy(() => import("../features/admin/pages/AdminOverviewPage.jsx"));
const DoctorManagementPage = lazy(() => import("../features/admin/pages/DoctorManagementPage.jsx"));
const VerificationPage = lazy(() => import("../features/admin/pages/VerificationPage.jsx"));
const FacilityManagementPage = lazy(() => import("../features/admin/pages/FacilityManagementPage.jsx"));
const AppointmentManagementPage = lazy(() => import("../features/admin/pages/AppointmentManagementPage.jsx"));
const SpecialtiesPage = lazy(() => import("../features/admin/pages/SpecialtiesPage.jsx"));
const AdminAvailabilityPage = lazy(() => import("../features/admin/pages/AdminAvailabilityPage.jsx"));

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
