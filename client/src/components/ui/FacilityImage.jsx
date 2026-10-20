import { facilityPlaceholder } from "../../utils/placeholders.js";

/** Clinic photo with a neutral building fallback. */
export default function FacilityImage({ src, alt = "", ...props }) {
  return <img src={src || facilityPlaceholder()} alt={alt} loading="lazy" {...props} />;
}
