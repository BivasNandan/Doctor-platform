import { ArrowRight, CheckCircle2, MessageCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, Notice, SectionHeading } from "../../components/ui.jsx";
import { isDemoMode, PATHS } from "../../constants.js";
import { useAuth } from "../../context.jsx";
import { supportService } from "../../services/index.js";

const TOPICS = [
  ["Booking an appointment", "Learn how to find a doctor and reserve a time."],
  ["Changing or cancelling", "Manage an upcoming appointment."],
  ["Your patient profile", "Update your contact and care details."],
  ["About verification", "How Carewell reviews professional profiles."],
];

export default function AssistancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [status, setStatus] = useState({ state: "idle", error: "" });

  useEffect(() => {
    if (user?.email) setEmail((current) => current || user.email);
  }, [user?.email]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", error: "" });
    try {
      await supportService.submit({ message: message.trim(), email: email.trim() });
      setMessage("");
      setEmail(user?.email ?? "");
      setStatus({ state: "sent", error: "", replyEmail: Boolean(email.trim()) });
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
            <Field
              label="Email for our reply"
              hint="Optional. We can only reply if you provide an email address."
            >
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
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
                  : status.replyEmail
                    ? "Your message was received. We’ll be in touch shortly."
                    : "Your message was received. Add an email address if you’d like a reply."}
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
