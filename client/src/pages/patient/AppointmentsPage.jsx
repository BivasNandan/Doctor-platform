import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppointmentCard from "../../components/patient/AppointmentCard.jsx";
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
  const confirm = useConfirm();
  const { facilities } = useCatalog();
  const [tab, setTab] = useState("all");
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
        eyebrow="YOUR CARE, ALL IN ONE PLACE"
        title={
          <>
            Appointments <em>made simple.</em>
          </>
        }
        description="Keep track of what’s coming up and revisit where you’ve been."
        action={
          <Button onClick={() => navigate(PATHS.doctors)}>
            <Plus size={15} /> Book a visit
          </Button>
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Filter appointments" />
      {appointments.loading && !appointments.data ? (
        <PageLoader />
      ) : appointments.error && !appointments.data ? (
        <ErrorState error={appointments.error} onRetry={appointments.reload} />
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
          title="Nothing on the calendar yet"
          description="When you book a visit, you’ll find the details here."
          action={
            <Button onClick={() => navigate(PATHS.doctors)}>
              Find a doctor <ArrowRight size={15} />
            </Button>
          }
        />
      )}
    </>
  );
}
