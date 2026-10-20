import { Search } from "lucide-react";
import Pill from "./Pill.jsx";

/** Search box with a result counter, shown above admin lists and tables. */
export default function ListToolbar({ placeholder, value, onChange, count, noun }) {
  return (
    <div className="table-toolbar surface">
      <div>
        <Search size={16} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <Pill>
        {count} {noun}
      </Pill>
    </div>
  );
}
