import { useState } from "react";
import { Check } from "lucide-react";
import { useCatalog } from "../../../context/CatalogContext.jsx";
import { useConfirm } from "../../../context/ConfirmContext.jsx";
import { useResource } from "../../../hooks/useResource.js";
import { availabilityService } from "../../../services/index.js";
import { localDateKey } from "../../../utils/date.js";
import { readForm } from "../../../utils/forms.js";
import { Button, DataTable, ErrorState, Field, Notice, StatusPill } from "../../../components/ui";

const byStart = (a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);

/**
 * Create, edit, block and remove a doctor's availability slots. Used by the
 * doctor workspace (own schedule) and by admins (`admin` + any doctor).
 * @param {{doctor: object, admin?: boolean, disabled?: boolean}} props
 */
export default function AvailabilityManager({ doctor, admin = false, disabled = false }) {
  const { facilities } = useCatalog();
  const confirm = useConfirm();
  const slots = useResource(() => availabilityService.list(doctor.id, { admin }), [doctor.id, admin]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const facilityName = (id) => facilities.find((item) => item.id === id)?.name ?? id;
  const clinicOptions = (doctor.facilityIds ?? []).map((id) => ({ id, name: facilityName(id) }));
  const scope = { admin };

  const upsert = (saved) =>
    slots.setData((items) => [...(items ?? []).filter((item) => item.id !== saved.id), saved]);
  const attempt = async (action) => {
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(err.message || "The change could not be saved.");
    }
  };

  const save = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    if (data.startTime >= data.endTime) return setError("End time must be after start time.");
    if (data.date < localDateKey()) return setError("Past availability dates cannot be saved.");
    return attempt(async () => {
      const payload = {
        facilityId: data.facilityId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        status: editing?.status || "available",
      };
      const saved = editing
        ? await availabilityService.update(editing.id, payload, scope)
        : await availabilityService.save(doctor.id, payload, scope);
      upsert(saved);
      setEditing(null);
      setNotice(`Slot ${editing ? "updated" : "created"}${saved.simulated ? " (simulated)" : ""}.`);
      form.reset();
    });
  };

  const toggleBlocked = (slot) =>
    attempt(async () => {
      const status = slot.status === "unavailable" ? "available" : "unavailable";
      const updated = await availabilityService.update(slot.id, { status }, scope);
      upsert(updated);
      setNotice(`Slot marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    });

  const remove = async (slot) => {
    const confirmed = await confirm({
      title: "Remove this slot?",
      message: `${slot.date} · ${slot.startTime}–${slot.endTime}`,
      confirmLabel: "Remove",
    });
    if (!confirmed) return;
    attempt(async () => {
      await availabilityService.remove(slot.id, scope);
      slots.setData((items) => items.filter((item) => item.id !== slot.id));
      setNotice("Slot removed.");
    });
  };

  const columns = [
    { key: "date", header: "DATE", render: (slot) => slot.date },
    { key: "clinic", header: "CLINIC", render: (slot) => facilityName(slot.facilityId) },
    { key: "time", header: "TIME", render: (slot) => `${slot.startTime}–${slot.endTime}` },
    {
      key: "status",
      header: "STATE",
      render: (slot) => (
        <>
          <StatusPill status={slot.status} />
          {slot.simulated ? " · simulated" : ""}
        </>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      render: (slot) => (
        <>
          <button
            className="table-action"
            type="button"
            disabled={disabled}
            onClick={() => {
              setEditing(slot);
              setError("");
            }}
          >
            Edit
          </button>
          <button
            className="table-action"
            type="button"
            disabled={disabled}
            onClick={() => toggleBlocked(slot)}
          >
            {slot.status === "unavailable" ? "Unblock" : "Block"}
          </button>
          <button className="table-action" type="button" disabled={disabled} onClick={() => remove(slot)}>
            Remove
          </button>
        </>
      ),
    },
  ];

  return (
    <>
      <Notice error>{error}</Notice>
      <Notice>{notice}</Notice>
      <form key={editing?.id ?? "new-slot"} className="inline-add-form surface" onSubmit={save}>
        <fieldset className="fieldset-reset availability-fields" disabled={disabled}>
          <Field label="Clinic">
            <select
              name="facilityId"
              required
              defaultValue={editing?.facilityId ?? clinicOptions[0]?.id ?? ""}
            >
              {clinicOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" name="date" min={localDateKey()} defaultValue={editing?.date ?? ""} required />
          </Field>
          <Field label="Start">
            <input type="time" name="startTime" defaultValue={editing?.startTime ?? ""} required />
          </Field>
          <Field label="End">
            <input type="time" name="endTime" defaultValue={editing?.endTime ?? ""} required />
          </Field>
          <Button type="submit">
            <Check size={14} /> {editing ? "Save changes" : "Create slot"}
          </Button>
          {editing && (
            <Button variant="outline" onClick={() => setEditing(null)}>
              Stop editing
            </Button>
          )}
        </fieldset>
      </form>
      {slots.error && !slots.data ? (
        <ErrorState error={slots.error} onRetry={slots.reload} />
      ) : (
        <DataTable
          columns={columns}
          rows={[...(slots.data ?? [])].sort(byStart)}
          getRowKey={(slot) => slot.id}
          emptyMessage={slots.loading ? "Loading availability…" : "No availability entries."}
        />
      )}
    </>
  );
}
