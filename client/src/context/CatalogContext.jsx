import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useResource } from "../hooks/useResource.js";
import { facilityService, specialtyService } from "../services/index.js";

const CatalogContext = createContext(null);

/** Waits between retries after a failed load: 2 s, 4 s, 8 s … at most 30 s. */
const retryDelay = (attempt) => Math.min(2000 * 2 ** attempt, 30000);

/**
 * Retries a failed load until it succeeds. The catalog is loaded once when the site opens, which
 * can be before the API has started or while the database is waking up; without retrying, every
 * specialty list and clinic name would stay empty until the page is reloaded.
 */
function useRetryOnError(resource) {
  const attempts = useRef(0);
  const { error, data, reload } = resource;
  useEffect(() => {
    if (data !== undefined) attempts.current = 0;
    if (!error) return undefined;
    const timer = setTimeout(reload, retryDelay(attempts.current));
    attempts.current += 1;
    return () => clearTimeout(timer);
  }, [error, data, reload]);
}

/**
 * Reference data shared by many screens: active clinics/hospitals and
 * specialties. Loaded once (retried until it succeeds); call `reload()` after an admin changes them.
 */
export function CatalogProvider({ children }) {
  const facilities = useResource(() => facilityService.list(), []);
  const specialties = useResource(() => specialtyService.list(), []);
  useRetryOnError(facilities);
  useRetryOnError(specialties);

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
