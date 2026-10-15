import { ROLES } from "../../constants/roles.js";
import { PATHS } from "../../constants/paths.js";

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
