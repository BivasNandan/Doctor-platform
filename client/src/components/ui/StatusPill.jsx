import { statusTone } from "../../constants.js";
import { capitalize } from "../../utils/format.js";
import Pill from "./Pill.jsx";

/** Pill coloured by a domain status ("pending", "accepted", "suspended"…). */
export default function StatusPill({ status, label }) {
  return <Pill tone={statusTone(status)}>{label ?? capitalize(status ?? "unknown")}</Pill>;
}
