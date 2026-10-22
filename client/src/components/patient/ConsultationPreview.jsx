import { Camera, Mic, Video, X } from "lucide-react";
import { useRef, useState } from "react";
import { useModalBehavior } from "../../hooks/useModalBehavior.js";

export default function ConsultationPreview({ onClose }) {
  const [callView, setCallView] = useState(false);
  const dialog = useRef(null);
  useModalBehavior(dialog, onClose);

  return (
    <div className="consultation-preview-backdrop">
      <section
        className="consultation-preview surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consult-title"
        ref={dialog}
      >
        <header>
          <div>
            <span className="eyebrow">UI PREVIEW · NO VIDEO CONNECTION</span>
            <h2 id="consult-title">Online consultation</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close online consultation preview"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="consultation-preview-note" role="status">
          This appointment has not been confirmed as a video visit. This screen is a visual preview only.
        </div>
        <div className={`consultation-stage${callView ? " is-call-view" : ""}`}>
          {callView ? (
            <>
              <Video size={34} />
              <strong>Call interface preview</strong>
              <span>No camera or microphone is connected.</span>
            </>
          ) : (
            <>
              <Camera size={34} />
              <strong>Waiting room preview</strong>
              <span>Your clinic would need to provide a video link.</span>
            </>
          )}
        </div>
        <div className="consultation-controls" aria-label="Preview controls">
          <span>
            <Mic size={16} /> Microphone unavailable
          </span>
          <span>
            <Camera size={16} /> Camera unavailable
          </span>
          <button
            className="button button-outline"
            type="button"
            onClick={() => setCallView((value) => !value)}
          >
            {callView ? "Show waiting room" : "Preview call screen"}
          </button>
        </div>
      </section>
    </div>
  );
}
