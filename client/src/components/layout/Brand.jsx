import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { PATHS } from "../../constants/paths.js";

/** Carewell wordmark linking home. */
export default function Brand({ size = 20, onClick }) {
  return (
    <Link className="brand" to={PATHS.discover} onClick={onClick}>
      <span className="brand-mark">
        <Activity size={size} />
      </span>
      <span>
        carewell<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
