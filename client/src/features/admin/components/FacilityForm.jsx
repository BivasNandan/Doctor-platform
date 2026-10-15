import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { isValidPhone, PHONE_PATTERN } from "../../../utils/validation.js";
import { readForm } from "../../../utils/forms.js";
import { Button, Field, Notice } from "../../../components/ui";

/**
 * Admin form to create or edit a clinic or hospital.
 * @param {{facility?: object, onSubmit: (input: object) => Promise<void>, onCancel: () => void}} props
 */
export default function FacilityForm({ facility, onSubmit, onCancel }) {
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
