import { useState } from "react";
import { useResource } from "../../../hooks/useResource.js";
import { adminService } from "../../../services/index.js";
import { Avatar, ErrorState, PageLoader, SectionHeading } from "../../../components/ui";
import AvailabilityManager from "../../availability/components/AvailabilityManager.jsx";

/** Admin view: pick any doctor and manage their schedule. */
export default function AdminAvailabilityPage() {
  const doctors = useResource(() => adminService.listDoctors(), []);
  const [selectedId, setSelectedId] = useState("");

  const list = doctors.data ?? [];
  const doctor = list.find((item) => item.id === selectedId) ?? list[0];

  return (
    <>
      <SectionHeading
        eyebrow="ADMINISTRATION"
        title={
          <>
            Availability <em>management.</em>
          </>
        }
        description="Configure a doctor’s clinic schedule. Backend access controls remain authoritative."
      />
      {doctors.error && !doctors.data ? (
        <ErrorState error={doctors.error} onRetry={doctors.reload} />
      ) : !doctors.data ? (
        <PageLoader />
      ) : (
        <div className="availability-layout">
          <aside className="availability-doctors surface" aria-label="Doctors">
            <span className="eyebrow">CHOOSE A DOCTOR</span>
            {list.map((item) => (
              <button
                type="button"
                key={item.id}
                className={doctor?.id === item.id ? "active" : ""}
                aria-pressed={doctor?.id === item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <Avatar src={item.image} name={item.name} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.specialty}</small>
                </span>
              </button>
            ))}
          </aside>
          <section className="availability-editor surface">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">ADMIN SCHEDULE</span>
                <h3>{doctor?.name ?? "No doctor selected"}</h3>
              </div>
            </div>
            {doctor ? (
              <AvailabilityManager key={doctor.id} doctor={doctor} admin />
            ) : (
              <div className="table-empty">No doctor profiles are available.</div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
