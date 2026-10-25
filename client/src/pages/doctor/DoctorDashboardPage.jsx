import { LogOut } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AvailabilityManager from "../../components/availability/AvailabilityManager.jsx";
import ProfileTab from "../../components/doctor/ProfileTab.jsx";
import RequestsTab from "../../components/doctor/RequestsTab.jsx";
import { ErrorState, Notice, PageLoader, SectionHeading, Tabs } from "../../components/ui/index.js";
import { isAccountRestricted, isDemoMode, ONBOARDING_STATUS, PATHS } from "../../constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useResource } from "../../hooks/useResource.js";
import { doctorPortalService } from "../../services/index.js";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "appointments", label: "Appointment requests" },
  { key: "availability", label: "Availability" },
];

export default function DoctorDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [notice, setNotice] = useState("");
  const profile = useResource(() => doctorPortalService.getProfile(), []);
  const doctor = profile.data;
  const restricted = isAccountRestricted(doctor);

  const signOut = async () => {
    await logout().catch(() => undefined);
    navigate(PATHS.doctorLogin);
  };

  if (profile.error && !doctor) return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (!doctor) return <PageLoader label="Loading your workspace…" />;
  // Until the administration approves the application, the application page is the workspace.
  if (doctor.onboardingStatus && doctor.onboardingStatus !== ONBOARDING_STATUS.APPROVED)
    return <Navigate to={PATHS.doctorApplication} replace />;

  return (
    <>
      <SectionHeading
        eyebrow="CAREWELL PORTAL"
        title="Doctor workspace"
        description={`Signed in as ${doctor.name} · ${
          isDemoMode
            ? "Demo identity; permissions are not enforced here."
            : "Account-scoped data from the service."
        }${doctor.accountStatus ? ` · Account ${doctor.accountStatus.replaceAll("_", " ")}` : ""}`}
      />
      {restricted && (
        <Notice error>
          This account is {doctor.accountStatus}; profile, appointment, and availability changes are
          unavailable. Sign out or contact administration.
        </Notice>
      )}
      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(key) => {
          setTab(key);
          setNotice("");
        }}
        label="Doctor workspace sections"
      >
        <button type="button" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </button>
      </Tabs>
      <Notice>{notice}</Notice>
      {tab === "profile" && (
        <ProfileTab
          doctor={doctor}
          restricted={restricted}
          onSaved={(updated) => profile.setData(updated)}
          onNotice={setNotice}
        />
      )}
      {tab === "appointments" && <RequestsTab restricted={restricted} />}
      {tab === "availability" && <AvailabilityManager doctor={doctor} disabled={restricted} />}
    </>
  );
}
