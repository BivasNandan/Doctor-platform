import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService, setUnauthorizedHandler } from "../services/index.js";

const AuthContext = createContext(null);

/**
 * Holds the signed-in user. The user object comes from the server; the UI uses
 * it only to choose what to show. Authorisation is always enforced by the API.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready"

  // Restore the session after a reload (cookie-based sessions).
  useEffect(() => {
    let cancelled = false;
    authService
      .getCurrentUser()
      .then((current) => !cancelled && setUser(current))
      .catch(() => undefined)
      .finally(() => !cancelled && setStatus("ready"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Any protected request that returns 401 signs the user out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    setUser(result.user);
    return result.user;
  }, []);

  const registerDoctor = useCallback(async (input) => {
    const result = await authService.registerDoctor(input);
    setUser(result.user);
    return result;
  }, []);

  const registerPatient = useCallback(async (input) => {
    const result = await authService.registerPatient(input);
    setUser(result.user);
    return result.user;
  }, []);

  const verifyEmail = useCallback(async (code) => {
    const result = await authService.verifyEmail(code);
    setUser(result.user);
    return result.user;
  }, []);

  const updateProfile = useCallback(async (input) => {
    const result = await authService.updateProfile(input);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === "loading",
      login,
      registerDoctor,
      registerPatient,
      verifyEmail,
      resendVerification: authService.resendVerification,
      updateProfile,
      logout,
    }),
    [user, status, login, registerDoctor, registerPatient, verifyEmail, updateProfile, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
