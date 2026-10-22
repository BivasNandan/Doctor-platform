import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "carewell:favorites";
const FavoritesContext = createContext(null);

function readFavorites() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }) {
  const [doctorIds, setDoctorIds] = useState(readFavorites);
  const toggle = useCallback((id) => {
    setDoctorIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Favorites remain available for this session when browser storage is unavailable.
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ doctorIds, toggle }), [doctorIds, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside <FavoritesProvider>.");
  return context;
}
