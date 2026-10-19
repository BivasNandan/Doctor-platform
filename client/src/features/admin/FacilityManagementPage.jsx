import { ArrowRight, CheckCircle2, Plus, X } from "lucide-react";
import { useState } from "react";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  ListToolbar,
  Notice,
  PageLoader,
  SectionHeading,
} from "../../components/ui.jsx";
import { useAction, useCatalog, useConfirm, useToast } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { adminService } from "../../services/index.js";
import { isValidPhone, PHONE_PATTERN, readForm } from "../../utils.js";
import { FacilityCard } from "../discovery/Cards.jsx";

// ─── FacilityManagementPage ────────────────────────────────────────────────────────────────

export default function FacilityManagementPage() {
  const run = useAction();
  const confirm = useConfirm();
  const { notify } = useToast();
  const catalog = useCatalog();
  const facilities = useResource(() => adminService.listFacilities(), []);
  const [editor, setEditor] = useState(null); // null = closed, {} = new, facility = editing
  const [query, setQuery] = useState("");

  const list = (facilities.data ?? []).filter((item) =>
    `${item.name} ${item.area}`.toLowerCase().includes(query.toLowerCase()),
  );
  const replace = (updated) =>
    facilities.setData((items) => items.map((item) => (item.id === updated.id ? updated : item)));

  // Errors are thrown on purpose: the form shows them next to the fields.
  const save = async (input) => {
    const isEdit = Boolean(editor?.id);
    const saved = isEdit
      ? await adminService.updateFacility(editor.id, input)
      : await adminService.addFacility(input);
    if (isEdit) replace(saved);
    else facilities.setData((items) => [saved, ...(items ?? [])]);
    catalog.reload();
    setEditor(null);
    notify(isEdit ? "Facility details updated." : "Facility profile saved.");
  };

  const deactivate = async (facility) => {
    const confirmed = await confirm({
      title: `Deactivate ${facility.name}?`,
      message: "It will no longer appear to patients or be offered when booking.",
      confirmLabel: "Deactivate",
    });
    if (!confirmed) return;
    const updated = await run(() => adminService.deactivateFacility(facility.id), {
      success: () => `${facility.name} deactivated.`,
    });
    if (updated) {
      replace(updated);
      catalog.reload();
    }
  };

  return (
    <>
      <SectionHeading
        eyebrow="PLACES THAT MAKE CARE POSSIBLE"
        title={
          <>
            Facility <em>management.</em>
          </>
        }
        description="Keep clinic and hospital information clear, current, and easy to find."
        action={
          <Button onClick={() => setEditor(editor ? null : {})}>
            <Plus size={15} /> Add facility
          </Button>
        }
      />
      {editor && (
        <FacilityForm
          key={editor.id ?? "new"}
          facility={editor.id ? editor : undefined}
          onSubmit={save}
          onCancel={() => setEditor(null)}
        />
      )}
      <ListToolbar
        placeholder="Search facilities…"
        value={query}
        onChange={setQuery}
        count={list.length}
        noun="facilities"
      />
      {facilities.error && !facilities.data ? (
        <ErrorState error={facilities.error} onRetry={facilities.reload} />
      ) : !facilities.data ? (
        <PageLoader />
      ) : list.length ? (
        <div className="facility-grid">
          {list.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              status={
                facility.active === false ? (
                  "Inactive"
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Visible in discovery
                  </>
                )
              }
              actions={
                <>
                  <Button variant="outline" onClick={() => setEditor(facility)}>
                    Edit details
                  </Button>
                  {facility.active !== false && (
                    <Button variant="outline" onClick={() => deactivate(facility)}>
                      Deactivate
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No facilities found"
          description="Try a different search, or add a new facility."
        />
      )}
    </>
  );
}

// ─── FacilityForm ──────────────────────────────────────────────────────────────────────────

/**
 * Admin form to create or edit a clinic or hospital.
 * @param {{facility?: object, onSubmit: (input: object) => Promise<void>, onCancel: () => void}} props
 */
function FacilityForm({ facility, onSubmit, onCancel }) {
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const data = readForm(event.currentTarget);
    const input = {
      name: data.name.trim(),
      type: data.type,
      address: data.address.trim(),
      area: data.area.trim(),
      city: data.city.trim(),
      phone: data.phone.trim(),
      openingHours: data.openingHours.trim(),
    };
    const found = {};
    if (input.name.length < 4) found.name = "Enter the facility name (4+ characters).";
    if (input.address.length < 5) found.address = "Enter the street address.";
    if (!input.area) found.area = "Enter the area.";
    if (!input.city) found.city = "Enter the city.";
    if (!isValidPhone(input.phone)) found.phone = "Enter a valid phone number.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError("");
    try {
      await onSubmit(input);
    } catch (error) {
      setFormError(error.message || "The facility could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form surface" onSubmit={submit} noValidate>
      <div className="panel-heading">
        <h3>{facility ? "Edit facility details" : "Add a facility"}</h3>
        <button type="button" onClick={onCancel} aria-label="Close form">
          <X size={17} />
        </button>
      </div>
      <div className="form-grid">
        <Field label="Facility name" error={errors.name}>
          <input
            name="name"
            required
            defaultValue={facility?.name ?? ""}
            placeholder="Clinic or hospital name"
          />
        </Field>
        <Field label="Facility type">
          <select name="type" defaultValue={facility?.type ?? "clinic"}>
            <option value="clinic">Clinic</option>
            <option value="hospital">Hospital</option>
          </select>
        </Field>
        <Field label="Street address" error={errors.address}>
          <input
            name="address"
            required
            defaultValue={facility?.address ?? ""}
            placeholder="House, road, block"
          />
        </Field>
        <Field label="Area" error={errors.area}>
          <input name="area" required defaultValue={facility?.area ?? ""} placeholder="Dhanmondi" />
        </Field>
        <Field label="City" error={errors.city}>
          <input name="city" required defaultValue={facility?.city ?? "Dhaka"} />
        </Field>
        <Field label="Contact phone" error={errors.phone}>
          <input
            name="phone"
            type="tel"
            required
            pattern={PHONE_PATTERN}
            defaultValue={facility?.phone ?? ""}
            placeholder="+880 2 XXXX XXXX"
          />
        </Field>
        <Field label="Opening hours" hint="Shown to patients, e.g. 8:00 AM–9:00 PM">
          <input
            name="openingHours"
            defaultValue={facility?.openingHours ?? ""}
            placeholder="8:00 AM–9:00 PM"
          />
        </Field>
      </div>
      <Notice error>{formError}</Notice>
      <div className="form-actions">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {facility ? "Save changes" : "Save facility"} <ArrowRight size={14} />
        </Button>
      </div>
    </form>
  );
}
