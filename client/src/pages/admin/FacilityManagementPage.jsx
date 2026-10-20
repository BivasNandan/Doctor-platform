import { CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import FacilityForm from "../../components/admin/FacilityForm.jsx";
import FacilityCard from "../../components/doctors/FacilityCard.jsx";
import {
  Button,
  EmptyState,
  ErrorState,
  ListToolbar,
  PageLoader,
  SectionHeading,
} from "../../components/ui/index.js";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";

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
