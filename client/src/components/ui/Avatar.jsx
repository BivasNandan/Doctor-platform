import { assetUrl } from "../../utils/assets.js";
import { avatarPlaceholder } from "../../utils/placeholders.js";

/** Person photo with a generated initials fallback. Inherits sizing from the parent's CSS. */
export default function Avatar({ src, name, alt = "", ...props }) {
  return <img src={assetUrl(src) || avatarPlaceholder(name)} alt={alt} loading="lazy" {...props} />;
}
