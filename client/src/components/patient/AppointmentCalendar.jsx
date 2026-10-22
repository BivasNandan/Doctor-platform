import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { APPOINTMENT_STATUS_LABELS, statusTone } from "../../constants.js";
import { localDateKey, parseDateKey } from "../../utils/dates.js";
import { useLanguage } from "../../context/LanguageContext.jsx";

const dayKey = (date) => localDateKey(date);

function makeDays(mode, cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const start = new Date(first);
  if (mode === "week") {
    start.setDate(cursor.getDate() - cursor.getDay());
  } else {
    start.setDate(1 - first.getDay());
  }
  const count = mode === "week" ? 7 : 42;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export default function AppointmentCalendar({ appointments }) {
  const { language, t } = useLanguage();
  const locale = language === "bn" ? "bn-BD" : "en";
  const [mode, setMode] = useState("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState("");
  const days = useMemo(() => makeDays(mode, cursor), [mode, cursor]);
  const byDay = useMemo(() => {
    const groups = new Map();
    appointments.forEach((item) => groups.set(item.date, [...(groups.get(item.date) ?? []), item]));
    return groups;
  }, [appointments]);
  const activeAppointments = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const periodLabel =
    mode === "month"
      ? cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })
      : `${days[0].toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;

  const move = (amount) => {
    setSelectedDay("");
    setCursor((current) => {
      const next = new Date(current);
      if (mode === "month") {
        next.setDate(1);
        next.setMonth(current.getMonth() + amount);
      } else next.setDate(current.getDate() + amount * 7);
      return next;
    });
  };

  return (
    <section className="appointment-calendar surface" aria-label="Appointment calendar">
      <div className="calendar-toolbar">
        <div className="calendar-period">
          <CalendarDays size={18} aria-hidden="true" />
          <h2>{periodLabel}</h2>
        </div>
        <div className="calendar-controls">
          <div className="calendar-mode" role="group" aria-label="Calendar range">
            <button
              type="button"
              aria-pressed={mode === "week"}
              onClick={() => {
                setMode("week");
                setSelectedDay("");
              }}
            >
              {t("Week")}
            </button>
            <button
              type="button"
              aria-pressed={mode === "month"}
              onClick={() => {
                setMode("month");
                setSelectedDay("");
              }}
            >
              {t("Month")}
            </button>
          </div>
          <button
            type="button"
            className="calendar-nav"
            aria-label="Previous period"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button type="button" className="calendar-nav" aria-label="Next period" onClick={() => move(1)}>
            <ChevronRight size={17} />
          </button>
          <button
            type="button"
            className="calendar-today"
            onClick={() => {
              setCursor(new Date());
              setSelectedDay(dayKey(new Date()));
            }}
          >
            {t("Today")}
          </button>
        </div>
      </div>
      <div
        className="calendar-grid"
        aria-label={mode === "month" ? "Monthly appointments" : "Weekly appointments"}
      >
        {(language === "bn" ? "রবি সোম মঙ্গল বুধ বৃহস্পতি শুক্র শনি" : "Sun Mon Tue Wed Thu Fri Sat")
          .split(" ")
          .map((label) => (
            <div className="calendar-weekday" key={label}>
              {label}
            </div>
          ))}
        {days.map((date) => {
          const key = dayKey(date);
          const entries = byDay.get(key) ?? [];
          const inPeriod = mode === "week" || date.getMonth() === cursor.getMonth();
          return (
            <button
              className={`calendar-day${inPeriod ? "" : " is-outside"}${selectedDay === key ? " is-selected" : ""}${key === dayKey(new Date()) ? " is-today" : ""}`}
              type="button"
              aria-label={`${date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}, ${entries.length} appointments`}
              aria-pressed={selectedDay === key}
              key={key}
              onClick={() => setSelectedDay(key)}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              <span className="calendar-events">
                {entries.slice(0, 2).map((item) => (
                  <span
                    className={`calendar-event tone-${statusTone(item.status)}`}
                    key={item.id}
                    title={`${item.time} · ${item.status}`}
                  >
                    <i aria-hidden="true" /> {item.time}
                  </span>
                ))}
                {entries.length > 2 && <span className="calendar-more">+{entries.length - 2} more</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-day-details" aria-live="polite">
        <h3>
          {selectedDay
            ? `${t("Appointments")} · ${parseDateKey(selectedDay).toLocaleDateString(locale, { month: "short", day: "numeric" })}`
            : t("Select a day to see appointments")}
        </h3>
        {selectedDay && activeAppointments.length ? (
          <ul>
            {activeAppointments.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.time}</strong> · {item.doctor?.name ?? "Doctor unavailable"}
                </span>
                <span className={`calendar-status tone-${statusTone(item.status)}`}>
                  {t(APPOINTMENT_STATUS_LABELS[item.status] ?? item.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : selectedDay ? (
          <p>{t("No appointments on this day.")}</p>
        ) : (
          <p>{t("Choose a date in the calendar. Appointment status is shown with each entry.")}</p>
        )}
      </div>
    </section>
  );
}
