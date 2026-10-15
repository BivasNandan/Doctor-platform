import { createContext, useContext, useMemo } from "react";
import { facilityService, specialtyService } from "../services/index.js";
import { useResource } from "../hooks/useResource.js";

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
