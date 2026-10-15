import { useState } from "react";
import { ArrowRight, CheckCircle2, MessageCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isDemoMode } from "../../../config/env.js";
import { PATHS } from "../../../constants/paths.js";
import { supportService } from "../../../services/index.js";
import { Button, Notice, SectionHeading } from "../../../components/ui";

const TOPICS = [
  ["Booking an appointment", "Learn how to find a doctor and reserve a time."],
  ["Changing or cancelling", "Manage an upcoming appointment."],
  ["Your patient profile", "Update your contact and care details."],
  ["About verification", "How Carewell reviews professional profiles."],
];

export default function AssistancePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState({ state: "idle", error: "" });

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", error: "" });
    try {
      await supportService.submit({ message: message.trim() });
      setMessage("");
      setStatus({ state: "sent", error: "" });
    } catch (error) {
      setStatus({ state: "idle", error: error.message || "Your message could not be sent." });
    }
  };

  return (
    <>
      <SectionHeading
        eyebrow="WE’RE HERE WITH YOU"
        title={
          <>
            How can we <em>help?</em>
          </>
        }
        description="A real person is here to make your care journey feel easier."
      />
      <div className="assistance-grid">
        <div className="assistance-card surface">
          <span className="assistance-icon">
            <MessageCircle size={20} />
          </span>
          <span className="eyebrow">TALK TO OUR TEAM</span>
          <h3>Let’s figure it out together.</h3>
          <p>Tell us what’s on your mind. Our patient support team is available every day, 8am–10pm.</p>
          <form onSubmit={submit}>
            <label className="filter-label">
              Your question
              <textarea
                required
                minLength={8}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="How can we help today?"
              />
            </label>
            <Notice error>{status.error}</Notice>
            <Button type="submit" disabled={status.state === "sending"}>
              {status.state === "sending" ? "Sending…" : "Send a message"} <ArrowRight size={15} />
            </Button>
            {status.state === "sent" && (
              <span className="success-inline" role="status">
                <CheckCircle2 size={14} />
                {isDemoMode
                  ? "Demo mode: your message was not delivered to anyone."
                  : "We’ll be in touch shortly."}
              </span>
            )}
          </form>
        </div>
        <div className="help-topics">
          <span className="eyebrow">QUICK ANSWERS</span>
          {TOPICS.map(([title, detail]) => (
            <details key={title}>
              <summary>
                {title}
                <Plus size={15} />
              </summary>
              <p>{detail}</p>
            </details>
          ))}
          <div className="emergency-note">
            <span>For urgent medical concerns</span>
            <strong>Please contact your local emergency service.</strong>
          </div>
        </div>
      </div>
      <button className="text-link assist-doctor-link" type="button" onClick={() => navigate(PATHS.doctors)}>
        Still need help? Browse doctors <ArrowRight size={15} />
      </button>
    </>
  );
}
