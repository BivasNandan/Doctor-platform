import {
  CalendarDays,
  Clock3,
  Compass,
  Hospital,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Star,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { matchPath } from "react-router-dom";
import { PATHS, ROLES } from "../../constants.js";

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
  [PATHS.doctorRegister, "Join as a doctor"],
  [PATHS.doctorApplication, "Doctor application"],
  [PATHS.doctorInvitation, "Doctor invitation"],
  [PATHS.doctorDashboard, "Doctor workspace"],
  [PATHS.adminLogin, "Administrator sign in"],
  [PATHS.admin, "Overview"],
  [PATHS.adminDoctors, "Doctor management"],
  [PATHS.adminVerification, "Verification"],
  [PATHS.adminFacilities, "Facility management"],
  [PATHS.adminAppointments, "Appointment management"],
  [PATHS.adminPatients, "Patient management"],
  [PATHS.adminReviews, "Review moderation"],
  [PATHS.adminSpecialties, "Specialties"],
  [PATHS.adminAvailability, "Availability"],
  [PATHS.adminSupport, "Support requests"],
  [PATHS.adminDeactivationRequests, "Deactivation review"],
];

export function routeTitle(pathname) {
  const match = ROUTE_TITLES.find(
    ([pattern]) => pattern && matchPath({ path: pattern, end: true }, pathname),
  );
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

// "Join as a doctor" is deliberately not here: it is linked from the footer and the doctor sign-in page.
const GUEST_GROUP = {
  label: "FOR PROFESSIONALS",
  items: [{ to: PATHS.doctorLogin, label: "Doctor sign in", icon: Users }],
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
    { to: PATHS.adminPatients, label: "Patient management", icon: UserRound },
    { to: PATHS.adminReviews, label: "Review moderation", icon: Star },
    { to: PATHS.adminSpecialties, label: "Specialties", icon: ListFilter },
    { to: PATHS.adminAvailability, label: "Availability", icon: Clock3 },
    { to: PATHS.adminSupport, label: "Support requests", icon: LifeBuoy },
    { to: PATHS.adminDeactivationRequests, label: "Deactivation review", icon: UserRound },
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
