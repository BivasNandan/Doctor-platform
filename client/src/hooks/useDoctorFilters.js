import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/** Filters accepted by GET /doctors. They live in the URL so searches are shareable. */
export const DEFAULT_FILTERS = Object.freeze({
  query: "",
  specialty: "",
  location: "",
  language: "",
  maxFee: "",
  minExperience: "",
  available: "",
  verified: false,
});

const isEmpty = (value) => value === "" || value === false || value == null;

/** Reads and updates the doctor-directory filters from the URL query string. */
export function useDoctorFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      query: params.get("query") ?? "",
      specialty: params.get("specialty") ?? "",
      location: params.get("location") ?? "",
      language: params.get("language") ?? "",
      maxFee: params.get("maxFee") ?? "",
      minExperience: params.get("minExperience") ?? "",
      available: params.get("available") ?? "",
      verified: params.get("verified") === "true",
    }),
    [params],
  );

  const setFilter = useCallback(
    (key, value) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (isEmpty(value)) next.delete(key);
          else next.set(key, String(value));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { filters, setFilter, clearFilters };
}
