import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
