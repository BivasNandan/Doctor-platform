import { avatarPlaceholder, facilityPlaceholder } from "../../utils/placeholders.js";

/** Person photo with a generated initials fallback. Inherits sizing from the parent's CSS. */
export function Avatar({ src, name, alt = "", ...props }) {
  return <img src={src || avatarPlaceholder(name)} alt={alt} loading="lazy" {...props} />;
}

/** Clinic photo with a neutral building fallback. */
export function FacilityImage({ src, alt = "", ...props }) {
  return <img src={src || facilityPlaceholder()} alt={alt} loading="lazy" {...props} />;
}
