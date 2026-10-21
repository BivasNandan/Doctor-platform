import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

/** Accessible glass dropdown scoped to the Messages page doctor picker. */
export default function DoctorPicker({ doctors, value, onChange }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const activeIndex = Math.max(
    0,
    doctors.findIndex((doctor) => String(doctor.id) === String(value)),
  );
  const selected = doctors.find((doctor) => String(doctor.id) === String(value));

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const currentIndex = doctors.findIndex((doctor) => String(doctor.id) === String(value));
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + doctors.length) % doctors.length;
      onChange(doctors[nextIndex]?.id ?? "");
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === " " && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="glass-select chat-doctor-picker">
      <button
        role="combobox"
        aria-activedescendant={open && selected ? `${listId}-option-${activeIndex}` : undefined}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="glass-select-trigger"
        disabled={doctors.length === 0}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false);
        }}
        type="button"
      >
        <span className={selected ? "" : "glass-select-placeholder"}>
          {selected?.name ?? "Choose a doctor…"}
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open && doctors.length > 0 && (
        <ul className="glass-select-menu" id={listId} role="listbox">
          {doctors.map((doctor, index) => {
            const isSelected = String(doctor.id) === String(value);
            return (
              // Keyboard selection is handled by the combobox trigger above.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                aria-selected={isSelected}
                className={`glass-select-option${isSelected ? " is-active" : ""}`}
                id={`${listId}-option-${index}`}
                key={doctor.id}
                onClick={() => {
                  onChange(doctor.id);
                  setOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
              >
                <span>{doctor.name}</span>
                {isSelected && <Check aria-hidden="true" size={15} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
