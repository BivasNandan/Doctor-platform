import { useRef } from "react";
import { useModalBehavior } from "../../hooks/useModalBehavior.js";

/**
 * Accessible modal dialog: scrim click and Escape close it, focus moves in,
 * is trapped while open and returns to the trigger afterwards.
 * `as` lets the dialog itself be a <form>.
 */
export default function Modal({ as: Tag = "div", labelledBy, onClose, className = "", children, ...props }) {
  const dialog = useRef(null);
  useModalBehavior(dialog, onClose);

  return (
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <Tag
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={className}
        {...props}
      >
        {children}
      </Tag>
    </div>
  );
}
