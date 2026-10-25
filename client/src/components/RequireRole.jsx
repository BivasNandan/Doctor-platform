import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PATHS, ROLES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PageLoader } from "./ui/index.js";

const LOGIN_PATH = {
  [ROLES.DOCTOR]: PATHS.doctorLogin,
};

/**
 * Route guard. Renders nested routes only for the given role(s); otherwise it
 * redirects to a sign-in page and remembers where the visitor was going so they
 * return there afterwards. Patients must also have verified their email.
 *
 * With `fallback`, refused visitors see it instead of a redirect, so the guard never
 * reveals a sign-in address (used by the administrator area).
 *
 * This is a UX convenience. The API must enforce authorisation on every request.
 *
 * @param {{role?: string, roles?: string[], fallback?: import("react").ReactNode}} props  Allowed role(s).
 */
export default function RequireRole({ role, roles = [role], fallback }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Checking your session…" />;
  if ((!user || !roles.includes(user.role)) && fallback) return fallback;
  if (!user || !roles.includes(user.role)) {
    const target = roles.length === 1 ? (LOGIN_PATH[roles[0]] ?? PATHS.login) : PATHS.login;
    return <Navigate to={target} replace state={{ from: location, reason: "protected" }} />;
  }
  if (user.role === ROLES.PATIENT && !user.emailVerified)
    return <Navigate to={PATHS.verifyEmail} replace state={{ from: location }} />;
  return <Outlet />;
}
