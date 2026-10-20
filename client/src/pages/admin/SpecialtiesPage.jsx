import { ArrowRight, Check, Plus, Sparkles, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Button, ErrorState, Field, PageLoader, Pill, SectionHeading } from "../../components/ui/index.js";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";
import { slugify } from "../../utils/format.js";

export default function SpecialtiesPage() {
  const run = useAction();
  const catalog = useCatalog();
  const specialties = useResource(() => adminService.listSpecialties(), []);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const items = specialties.data ?? [];

  const add = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    if (name.length < 3 || items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setError("Enter a unique specialty name with at least 3 characters.");
      return;
    }
    const added = await run(
      () =>
        adminService.addSpecialty({
          name,
          slug: slugify(name),
          description: String(data.get("description")).trim(),
        }),
      { success: "Specialty added." },
    );
    if (!added) return;
    specialties.setData((list) => [...list, added]);
    catalog.reload();
    setShowForm(false);
    setError("");
  };

  const toggle = async (specialty) => {
    const active = specialty.active === false;
    const updated = await run(() => adminService.setSpecialtyActive(specialty.id, active), {
      success: () => `${specialty.name} ${active ? "activated" : "deactivated"}.`,
    });
    if (!updated) return;
    specialties.setData((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    catalog.reload();
  };

  return (
    <>
      <SectionHeading
        eyebrow="CARE, ORGANIZED THOUGHTFULLY"
        title={
          <>
            Specialties, made <em>clear.</em>
          </>
        }
        description="Help patients find the right kind of care, without the guesswork."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> Add specialty
          </Button>
        }
      />
      {showForm && (
        <form className="inline-add-form surface" onSubmit={add}>
          <Field label="Specialty name" error={error}>
            <input name="name" required placeholder="e.g. Endocrinology" />
          </Field>
          <Field label="Short description">
            <input name="description" required placeholder="e.g. Hormones & metabolism" />
          </Field>
          <Button type="submit">
            Add to directory <ArrowRight size={14} />
          </Button>
        </form>
      )}
      {specialties.error && !specialties.data ? (
        <ErrorState error={specialties.error} onRetry={specialties.reload} />
      ) : !specialties.data ? (
        <PageLoader />
      ) : (
        <div className="specialty-grid">
          {items.map((specialty, index) => (
            <article className="specialty-card surface" key={specialty.id}>
              <span className={`specialty-icon specialty-icon-${index % 4}`}>
                <Stethoscope size={19} />
              </span>
              <div>
                <h3>{specialty.name}</h3>
                <p>{specialty.description}</p>
              </div>
              <Pill tone={specialty.active === false ? "neutral" : "verified"}>
                {specialty.active === false ? "Inactive" : "Active"}
              </Pill>
              <Button variant="outline" onClick={() => toggle(specialty)}>
                {specialty.active === false ? "Activate" : "Deactivate"}
              </Button>
            </article>
          ))}
        </div>
      )}
      <div className="empty-admin surface">
        <Sparkles size={18} />
        <span>
          <strong>Thoughtfully curated</strong>
          <small>Every specialty is reviewed to help patients navigate care confidently.</small>
        </span>
        <Pill tone="verified">
          <Check size={12} /> Active
        </Pill>
      </div>
    </>
  );
}
