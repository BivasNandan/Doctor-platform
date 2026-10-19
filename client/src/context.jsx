import { CheckCircle2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "./components/ui.jsx";
import { useResource } from "./hooks.js";
import { authService, facilityService, setUnauthorizedHandler, specialtyService } from "./services/index.js";

// ─── ThemeContext ──────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "carewell-theme";
const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
}

const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** Owns the light/dark/system preference and mirrors it onto <html data-theme>. */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredTheme);
  const [system, setSystem] = useState(systemTheme);
  const resolvedTheme = preference === "system" ? system : preference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* storage unavailable (private mode): keep the in-memory preference */
    }
  }, [preference, resolvedTheme]);

  const toggleTheme = useCallback(
    () => setPreference(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme],
  );

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggleTheme }),
    [preference, resolvedTheme, toggleTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}

// ─── ToastContext ──────────────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);
const TOAST_DURATION_MS = 3600;

/** App-wide transient notifications. Use `useToast().notify(message)`. */
export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const notify = useCallback((text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}

// ─── useAction ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs a mutation and reports the outcome as a toast.
 *
 *   const run = useAction();
 *   await run(() => adminService.deactivateDoctor(id), { success: (doctor) => `${doctor.name} deactivated.` });
 *
 * Resolves with the mutation result, or `undefined` when it failed
 * (the error message has already been shown).
 */
export function useAction() {
  const { notify } = useToast();
  return useCallback(
    async (mutation, { success } = {}) => {
      try {
        const result = await mutation();
        if (success) notify(typeof success === "function" ? success(result) : success);
        return result;
      } catch (error) {
        notify(error.message || "Something went wrong. Please try again.");
        return undefined;
      }
    },
    [notify],
  );
}

// ─── ConfirmContext ────────────────────────────────────────────────────────────────────────

const ConfirmContext = createContext(null);

/**
 * Promise-based replacement for window.confirm().
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Deactivate?", message: "..." }))) return;
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setRequest(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <ConfirmDialog {...request} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return context;
}

// ─── AuthContext ───────────────────────────────────────────────────────────────────────────

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

// ─── CatalogContext ────────────────────────────────────────────────────────────────────────

const CatalogContext = createContext(null);

/**
 * Reference data shared by many screens: active clinics/hospitals and
 * specialties. Loaded once; call `reload()` after an admin changes them.
 */
export function CatalogProvider({ children }) {
  const facilities = useResource(() => facilityService.list(), []);
  const specialties = useResource(() => specialtyService.list(), []);

  const {
    data: facilityData,
    loading: facilitiesLoading,
    error: facilitiesError,
    reload: reloadFacilities,
  } = facilities;
  const {
    data: specialtyData,
    loading: specialtiesLoading,
    error: specialtiesError,
    reload: reloadSpecialties,
  } = specialties;

  const value = useMemo(
    () => ({
      facilities: facilityData ?? [],
      specialties: specialtyData ?? [],
      loading: facilitiesLoading || specialtiesLoading,
      error: facilitiesError || specialtiesError,
      reload: () => {
        reloadFacilities();
        reloadSpecialties();
      },
    }),
    [
      facilityData,
      specialtyData,
      facilitiesLoading,
      specialtiesLoading,
      facilitiesError,
      specialtiesError,
      reloadFacilities,
      reloadSpecialties,
    ],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used inside <CatalogProvider>.");
  return context;
}
