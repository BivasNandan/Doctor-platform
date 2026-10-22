import { ArrowRight, CalendarDays, Clock3, MessageCircle, Search, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABELS, PATHS } from "../../constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useResource } from "../../hooks/useResource.js";
import { appointmentService, messagingService } from "../../services/index.js";
import { localDateKey, parseDateKey } from "../../utils/dates.js";
import { Avatar, Button, Pill } from "../ui/index.js";

const dateLabel = (value, locale) =>
  parseDateKey(value).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="patient-dashboard-stat surface">
      <span className="patient-dashboard-stat-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = language === "bn" ? "bn-BD" : "en-BD";
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  const appointments = useResource(() => appointmentService.list(), []);
  const conversations = useResource(() => messagingService.listConversations(), []);
  const items = appointments.data ?? [];
  const today = localDateKey();
  const upcoming = items
    .filter((item) => item.date >= today && item.status === APPOINTMENT_STATUS.ACCEPTED)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
  const pending = items
    .filter((item) => item.date >= today && item.status === APPOINTMENT_STATUS.PENDING)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
  const recentConversations = (conversations.data ?? []).slice(0, 3);
  const completedCount = items.filter((item) => item.status === APPOINTMENT_STATUS.COMPLETED).length;
  const upcomingCount = items.filter(
    (item) =>
      item.date >= today && [APPOINTMENT_STATUS.ACCEPTED, APPOINTMENT_STATUS.PENDING].includes(item.status),
  ).length;
  const pendingCount = items.filter((item) => item.status === APPOINTMENT_STATUS.PENDING).length;

  return (
    <section className="patient-dashboard" aria-labelledby="patient-dashboard-title">
      <div className="patient-dashboard-welcome">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} /> {t("YOUR CARE, ALL IN ONE PLACE")}
          </span>
          <h2 id="patient-dashboard-title">
            {t("Welcome back")}, <em>{user?.name?.split(" ")[0] || t("there")}.</em>
          </h2>
          <p>
            {upcoming
              ? t("Your next visit is coming up. Here’s your care at a glance.")
              : t("Your care, appointments, and conversations in one place.")}
          </p>
        </div>
        <Link className="patient-dashboard-browse" to={PATHS.doctors}>
          <Search size={16} /> {t("Find a doctor")}
        </Link>
      </div>

      <div className="patient-dashboard-stats" aria-label={t("Appointment statistics")}>
        <Stat
          label={t("Upcoming visits")}
          value={appointments.data === undefined ? "—" : number(upcomingCount)}
          icon={CalendarDays}
        />
        <Stat
          label={t("Awaiting confirmation")}
          value={appointments.data === undefined ? "—" : number(pendingCount)}
          icon={Clock3}
        />
        <Stat
          label={t("Completed visits")}
          value={appointments.data === undefined ? "—" : number(completedCount)}
          icon={Sparkles}
        />
      </div>

      <div className="patient-dashboard-grid">
        <section className="patient-dashboard-next surface" aria-labelledby="patient-next-title">
          <div className="patient-dashboard-section-head">
            <div>
              <span className="eyebrow">{t("YOUR NEXT STEP")}</span>
              <h3 id="patient-next-title">{t("Next appointment")}</h3>
            </div>
            <Link to={PATHS.appointments} aria-label={t("View all appointments")}>
              <ArrowRight size={18} />
            </Link>
          </div>
          {appointments.loading && !appointments.data ? (
            <p className="patient-dashboard-muted" role="status">
              {t("Loading appointments…")}
            </p>
          ) : appointments.error && !appointments.data ? (
            <div className="patient-dashboard-situation">
              <div>
                <strong>{t("Appointments are unavailable right now")}</strong>
                <p>{t("Try loading your appointment details again.")}</p>
              </div>
              <Button variant="outline" onClick={appointments.reload}>
                {t("Try again")}
              </Button>
            </div>
          ) : upcoming ? (
            <div className="patient-dashboard-appointment">
              <div className="patient-dashboard-date">
                <strong>{parseDateKey(upcoming.date).toLocaleDateString(locale, { day: "2-digit" })}</strong>
                <span>{parseDateKey(upcoming.date).toLocaleDateString(locale, { month: "short" })}</span>
              </div>
              <div className="patient-dashboard-appointment-info">
                <strong>{upcoming.doctor?.name ?? t("Your doctor")}</strong>
                <span>
                  {dateLabel(upcoming.date, locale)} · {upcoming.time}
                </span>
                <Pill tone="available">{t(APPOINTMENT_STATUS_LABELS[upcoming.status])}</Pill>
              </div>
            </div>
          ) : pending ? (
            <div className="patient-dashboard-situation">
              <span className="patient-dashboard-situation-icon">
                <Clock3 size={19} />
              </span>
              <div>
                <strong>{t("Your request is awaiting confirmation")}</strong>
                <p>
                  {pending.doctor?.name ?? t("Your doctor")} · {dateLabel(pending.date, locale)} ·{" "}
                  {pending.time}
                </p>
              </div>
            </div>
          ) : (
            <div className="patient-dashboard-situation">
              <span className="patient-dashboard-situation-icon">
                <CalendarDays size={19} />
              </span>
              <div>
                <strong>
                  {items.length ? t("You’re all caught up") : t("Start with a doctor you trust")}
                </strong>
                <p>
                  {items.length
                    ? t("There are no upcoming visits. Book whenever you’re ready.")
                    : t("Browse specialists and request your first appointment.")}
                </p>
              </div>
              <Button onClick={() => navigate(PATHS.doctors)}>{t("Browse doctors")}</Button>
            </div>
          )}
        </section>

        <section className="patient-dashboard-quick surface" aria-labelledby="patient-quick-title">
          <span className="eyebrow">{t("QUICK ACTIONS")}</span>
          <h3 id="patient-quick-title">{t("What would you like to do?")}</h3>
          <Link to={PATHS.doctors}>
            <span>
              <Search size={17} />
            </span>
            {t("Find a doctor")}
            <ArrowRight size={16} />
          </Link>
          <Link to={PATHS.appointments}>
            <span>
              <CalendarDays size={17} />
            </span>
            {t("View appointments")}
            <ArrowRight size={16} />
          </Link>
          <Link to={PATHS.messages}>
            <span>
              <MessageCircle size={17} />
            </span>
            {t("Open messages")}
            <ArrowRight size={16} />
          </Link>
        </section>

        <section className="patient-dashboard-conversations surface" aria-labelledby="patient-recent-title">
          <div className="patient-dashboard-section-head">
            <div>
              <span className="eyebrow">{t("STAY CONNECTED")}</span>
              <h3 id="patient-recent-title">{t("Recent conversations")}</h3>
            </div>
            <Link to={PATHS.messages} aria-label={t("View all conversations")}>
              <ArrowRight size={18} />
            </Link>
          </div>
          {conversations.loading && !conversations.data ? (
            <p className="patient-dashboard-muted" role="status">
              {t("Loading conversations…")}
            </p>
          ) : conversations.error && !conversations.data ? (
            <p className="patient-dashboard-muted">
              {t("Conversations are unavailable right now.")}{" "}
              <Link to={PATHS.messages}>{t("Open messages")}</Link>
            </p>
          ) : recentConversations.length ? (
            recentConversations.map((conversation) => (
              <Link className="patient-dashboard-conversation" to={PATHS.messages} key={conversation.id}>
                <Avatar src={conversation.participantImage} name={conversation.participantName} />
                <span>
                  <strong>{conversation.participantName}</strong>
                  <small>
                    {conversation.lastMessage?.body ??
                      conversation.lastMessage ??
                      t("Open your conversation")}
                  </small>
                  {conversation.updatedAt && <small>{conversation.updatedAt}</small>}
                </span>
                {conversation.unread > 0 && (
                  <span className="patient-dashboard-unread" aria-label={`${conversation.unread} unread`}>
                    {conversation.unread}
                  </span>
                )}
              </Link>
            ))
          ) : (
            <p className="patient-dashboard-muted">
              {t("No conversations yet. A conversation appears here when a doctor responds to your request.")}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
