import { ArrowRight, CalendarDays, List, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppointmentCard from "../../components/patient/AppointmentCard.jsx";
import AppointmentCalendar from "../../components/patient/AppointmentCalendar.jsx";
import {
  Button,
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeading,
  Tabs,
} from "../../components/ui/index.js";
import { APPOINTMENT_STATUS_LABELS, PATHS } from "../../constants.js";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useResource } from "../../hooks/useResource.js";
import { appointmentService } from "../../services/index.js";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: APPOINTMENT_STATUS_LABELS.pending },
  { key: "accepted", label: APPOINTMENT_STATUS_LABELS.accepted },
  { key: "rejected", label: APPOINTMENT_STATUS_LABELS.rejected },
  { key: "cancelled", label: APPOINTMENT_STATUS_LABELS.cancelled },
  { key: "completed", label: "History" },
];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const { facilities } = useCatalog();
  const [tab, setTab] = useState("all");
  const [view, setView] = useState("list");
  const appointments = useResource(() => appointmentService.list(), []);

  const cancel = async (id) => {
    const confirmed = await confirm({
      title: "Cancel this request?",
      message: "The clinic will be told the request was cancelled.",
      confirmLabel: "Cancel request",
      cancelLabel: "Keep it",
    });
    if (!confirmed) return;
    try {
      const updated = await appointmentService.cancel(id);
      appointments.setData((items) => items.map((item) => (item.id === id ? updated : item)));
      notify(`Request ${updated.id} marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    } catch (error) {
      notify(error.message);
    }
  };

  const visible = (appointments.data ?? []).filter((item) => tab === "all" || item.status === tab);
  const findFacility = (item) =>
    item.facility ?? facilities.find((facility) => facility.id === item.facilityId);

  return (
    <>
      <SectionHeading
        eyebrow={t("YOUR CARE, ALL IN ONE PLACE")}
        title={
          <>
            {t("Appointments")} <em>{t("made simple.")}</em>
          </>
        }
        description={t("Keep track of what’s coming up and revisit where you’ve been.")}
        action={
          <Button onClick={() => navigate(PATHS.doctors)}>
            <Plus size={15} /> {t("Book a visit")}
          </Button>
        }
      />
      <Tabs
        tabs={TABS.map((item) => ({ ...item, label: t(item.label) }))}
        value={tab}
        onChange={setTab}
        label={t("Filter appointments")}
      />
      <div className="appointment-view-toggle" role="group" aria-label="Appointment display">
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
          <List size={15} /> {t("List")}
        </button>
        <button type="button" aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>
          <CalendarDays size={15} /> {t("Calendar")}
        </button>
      </div>
      {appointments.loading && !appointments.data ? (
        <PageLoader />
      ) : appointments.error && !appointments.data ? (
        <ErrorState error={appointments.error} onRetry={appointments.reload} />
      ) : view === "calendar" ? (
        <AppointmentCalendar appointments={visible} />
      ) : visible.length ? (
        <div className="appointment-list">
          {visible.map((item) => (
            <AppointmentCard
              key={item.id}
              appointment={item}
              doctor={item.doctor}
              facility={findFacility(item)}
              onCancel={cancel}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("Nothing on the calendar yet")}
          description={t("When you book a visit, you’ll find the details here.")}
          action={
            <Button onClick={() => navigate(PATHS.doctors)}>
              {t("Find a doctor")} <ArrowRight size={15} />
            </Button>
          }
        />
      )}
    </>
  );
}
