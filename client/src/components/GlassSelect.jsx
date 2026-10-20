import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

/** Accessible custom select with a translucent, blurred option panel. */
export default function GlassSelect({ name, options, value = "", placeholder, disabled }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => String(option.id) === String(value)),
    ),
  );
  const selected = options.find((option) => String(option.id) === String(selectedValue));

  const choose = (option) => {
    setSelectedValue(option.id);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(
          Math.max(
            0,
            options.findIndex((option) => String(option.id) === String(selectedValue)),
          ),
        );
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === " " && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="glass-select">
      <input type="hidden" name={name} value={selectedValue} readOnly />
      <button
        aria-activedescendant={open && options[activeIndex] ? `${listId}-option-${activeIndex}` : undefined}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="glass-select-trigger"
        disabled={disabled || options.length === 0}
        onClick={() => {
          setActiveIndex(
            Math.max(
              0,
              options.findIndex((option) => String(option.id) === String(selectedValue)),
            ),
          );
          setOpen((isOpen) => !isOpen);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        type="button"
      >
        <span className={selected ? "" : "glass-select-placeholder"}>{selected?.name ?? placeholder}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open && (
        <ul className="glass-select-menu" id={listId} role="listbox">
          {options.map((option, index) => {
            const isSelected = String(option.id) === String(selectedValue);
            return (
              <li
                aria-selected={isSelected}
                className={`glass-select-option${index === activeIndex ? " is-active" : ""}`}
                id={`${listId}-option-${index}`}
                key={option.id}
                onClick={() => choose(option)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
              >
                <span>{option.name}</span>
                {isSelected && <Check aria-hidden="true" size={15} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
