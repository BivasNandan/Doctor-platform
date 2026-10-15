import { useState } from "react";
import { Plus } from "lucide-react";
import { ACCOUNT_STATUS, PUBLICATION_STATUS, VERIFICATION_STATUS } from "../../../constants/statuses.js";
import { useAction } from "../../../hooks/useAction.js";
import { useConfirm } from "../../../context/ConfirmContext.jsx";
import { useToast } from "../../../context/ToastContext.jsx";
import { useResource } from "../../../hooks/useResource.js";
import { adminService } from "../../../services/index.js";
import { formatFee } from "../../../utils/format.js";
import {
  Avatar,
  Button,
  DataTable,
  ErrorState,
  ListToolbar,
  PageLoader,
  SectionHeading,
  StatusPill,
} from "../../../components/ui";
import DoctorEditorForm from "../components/DoctorEditorForm.jsx";

export default function DoctorManagementPage() {
  const run = useAction();
  const confirm = useConfirm();
  const { notify } = useToast();
  const doctors = useResource(() => adminService.listDoctors(), []);
  const [editor, setEditor] = useState(null); // null = closed, {} = new, doctor = editing
  const [query, setQuery] = useState("");

  const replace = (updated) =>
    doctors.setData((items) => items.map((item) => (item.id === updated.id ? updated : item)));

  // Errors are thrown on purpose: the form shows them next to the fields.
  const save = async (profile) => {
    const isEdit = Boolean(editor?.id);
    const saved = isEdit
      ? await adminService.updateDoctor(editor.id, profile)
      : await adminService.addDoctor(profile);
    if (isEdit) replace(saved);
    else doctors.setData((items) => [saved, ...(items ?? [])]);
    setEditor(null);
    notify(isEdit ? `Updated ${saved.name}.` : "Doctor profile saved as pending verification.");
  };

  const verify = (doctor, status) =>
    run(() => adminService.setVerification(doctor.id, status), {
      success: () => `${doctor.name} ${status}.`,
    }).then((updated) => updated && replace(updated));

  const publish = (doctor, status) =>
    run(() => adminService.setPublication(doctor.id, status), {
      success: () => `${doctor.name} profile ${status}.`,
    }).then((updated) => updated && replace(updated));

  const deactivate = async (doctor) => {
    const confirmed = await confirm({
      title: `Deactivate ${doctor.name}?`,
      message: "Their public profile is hidden and they can no longer sign in.",
      confirmLabel: "Deactivate",
    });
    if (!confirmed) return;
    const updated = await run(() => adminService.deactivateDoctor(doctor.id), {
      success: () => `${doctor.name} deactivated.`,
    });
    if (updated) replace(updated);
  };

  const list = (doctors.data ?? []).filter((doctor) =>
    `${doctor.name} ${doctor.specialty}`.toLowerCase().includes(query.toLowerCase()),
  );

  const columns = [
    {
      key: "doctor",
      header: "DOCTOR",
      render: (doctor) => (
        <div className="table-person">
          <Avatar src={doctor.image} name={doctor.name} />
          <span>
            <strong>{doctor.name}</strong>
            <small>{doctor.qualifications.join(", ")}</small>
          </span>
        </div>
      ),
    },
    { key: "specialty", header: "SPECIALTY", render: (doctor) => doctor.specialty },
    { key: "location", header: "LOCATION", render: (doctor) => doctor.location },
    { key: "fee", header: "FEE", render: (doctor) => formatFee(doctor.fee) },
    {
      key: "status",
      header: "STATUS",
      render: (doctor) => (
        <>
          <StatusPill status={doctor.verificationStatus} /> <StatusPill status={doctor.publicationStatus} />
        </>
      ),
    },
    {
      key: "action",
      header: "ACTION",
      render: (doctor) => {
        const verified = doctor.verificationStatus === VERIFICATION_STATUS.VERIFIED;
        const published = doctor.publicationStatus === PUBLICATION_STATUS.PUBLISHED;
        const active = !doctor.accountStatus || doctor.accountStatus === ACCOUNT_STATUS.ACTIVE;
        return (
          <>
            <button className="table-action" type="button" onClick={() => setEditor(doctor)}>
              Edit
            </button>
            {doctor.verificationStatus === VERIFICATION_STATUS.PENDING && (
              <button
                className="table-action"
                type="button"
                onClick={() => verify(doctor, VERIFICATION_STATUS.VERIFIED)}
              >
                Approve
              </button>
            )}
            {verified && (
              <>
                <button
                  className="table-action"
                  type="button"
                  onClick={() => verify(doctor, VERIFICATION_STATUS.SUSPENDED)}
                >
                  Suspend verification
                </button>
                <button
                  className="table-action"
                  type="button"
                  onClick={() =>
                    publish(doctor, published ? PUBLICATION_STATUS.UNPUBLISHED : PUBLICATION_STATUS.PUBLISHED)
                  }
                >
                  {published ? "Unpublish" : "Publish"}
                </button>
              </>
            )}
            {active ? (
              <button className="table-action" type="button" onClick={() => deactivate(doctor)}>
                Deactivate
              </button>
            ) : (
              <span>{doctor.accountStatus.replaceAll("_", " ")}</span>
            )}
          </>
        );
      },
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="THE PEOPLE BEHIND GREAT CARE"
        title={
          <>
            Doctor <em>management.</em>
          </>
        }
        description="Thoughtfully manage professional profiles and their visibility."
        action={
          <Button onClick={() => setEditor(editor ? null : {})}>
            <Plus size={15} /> Add doctor
          </Button>
        }
      />
      {editor && (
        <DoctorEditorForm
          key={editor.id ?? "new"}
          doctor={editor.id ? editor : undefined}
          onSubmit={save}
          onCancel={() => setEditor(null)}
        />
      )}
      <ListToolbar
        placeholder="Search doctors…"
        value={query}
        onChange={setQuery}
        count={list.length}
        noun="profiles"
      />
      {doctors.error && !doctors.data ? (
        <ErrorState error={doctors.error} onRetry={doctors.reload} />
      ) : !doctors.data ? (
        <PageLoader />
      ) : (
        <DataTable
          columns={columns}
          rows={list}
          getRowKey={(doctor) => doctor.id}
          emptyMessage="No doctor profiles match your search."
        />
      )}
    </>
  );
}
