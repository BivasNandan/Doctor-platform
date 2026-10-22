import { Check } from "lucide-react";
import { isDemoMode } from "../../constants.js";
import { localDateKey } from "../../utils/dates.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { ErrorState, SkeletonGrid } from "../ui/index.js";

/** The next seven calendar days, starting today. */
function upcomingDates(locale, count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      key: localDateKey(date),
      day: date.toLocaleDateString(locale, { weekday: "short" }),
      date: date.toLocaleDateString(locale, { day: "2-digit" }),
    };
  });
}

/**
 * @param {{date: string, time: string, onDate: (key: string) => void,
 *   onTime: (slot: import('../../types.js').OpenSlot) => void,
 *   slots: {data?: import('../../types.js').OpenSlot[], loading: boolean, error: Error|null, reload: () => void}}} props
 */
export default function ScheduleStep({ date, time, onDate, onTime, slots }) {
  const { language, t } = useLanguage();
  const dates = upcomingDates(language === "bn" ? "bn-BD" : "en");
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        {t("Pick a day that")}
        <br />
        <em>{t("works for you.")}</em>
      </h2>
      <p className="dialog-doctor">{t("Times are shown in the clinic’s local time (BST, UTC+6)")}</p>
      {isDemoMode && <p className="availability-disclosure">{t("Demo appointment times are simulated.")}</p>}
      <div className="date-list" role="group" aria-label={t("Choose a date")}>
        {dates.map(({ key, day, date: dayOfMonth }) => (
          <button
            type="button"
            key={key}
            aria-pressed={date === key}
            className={date === key ? "date-selected" : ""}
            onClick={() => onDate(key)}
          >
            <small>{day}</small>
            <strong>{dayOfMonth}</strong>
          </button>
        ))}
      </div>
      {!date && <p className="privacy-note">{t("Choose a date to see available times.")}</p>}
      {date && slots.loading && <SkeletonGrid count={2} />}
      {date && !slots.loading && slots.error && (
        <ErrorState error={slots.error} onRetry={slots.reload} title="Times couldn’t be loaded" />
      )}
      {date && !slots.loading && !slots.error && slots.data && (
        <div className="time-list" role="group" aria-label={t("Choose a time")}>
          {slots.data.map((slot) => {
            const unavailable = slot.status !== "available";
            return (
              <button
                type="button"
                key={slot.label}
                disabled={unavailable}
                aria-pressed={time === slot.label}
                className={`${time === slot.label ? "time-selected" : ""} ${unavailable ? "time-disabled" : ""}`}
                onClick={() => onTime(slot)}
              >
                {slot.label}
                {time === slot.label && <Check size={13} />}
                {slot.status === "booked" && <small>{t("Booked")}</small>}
                {slot.status === "passed" && <small>{t("Passed")}</small>}
              </button>
            );
          })}
          {!slots.data.length && <p className="privacy-note">{t("No times are available on this day.")}</p>}
        </div>
      )}
    </div>
  );
}
