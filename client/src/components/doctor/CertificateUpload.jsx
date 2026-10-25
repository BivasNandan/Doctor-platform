import { Upload } from "lucide-react";
import { useState } from "react";
import { CERTIFICATE_KINDS } from "../../constants.js";
import { Button, Field, Notice } from "../ui/index.js";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Picks a certificate (PDF or image, up to 10 MB) and what kind it is. The server checks the file
 * again; this only gives fast feedback.
 * @param {{onUpload: (file: File, kind: string) => Promise<unknown>, defaultKind?: string,
 *   disabled?: boolean}} props  `onUpload` may throw; its message is shown.
 */
export default function CertificateUpload({ onUpload, defaultKind = "bmdc", disabled = false }) {
  const [kind, setKind] = useState(defaultKind);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return setError("Choose a file to upload.");
    if (file.size > MAX_BYTES) return setError("The file is larger than 10 MB.");
    setBusy(true);
    setError("");
    try {
      await onUpload(file, kind);
      setFile(null);
      setInputKey((value) => value + 1); // clears the file input
    } catch (err) {
      setError(err.message || "The file could not be uploaded.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="certificate-upload" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Document type">
          <select value={kind} onChange={(event) => setKind(event.target.value)} disabled={disabled}>
            {CERTIFICATE_KINDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="File" hint="PDF, JPEG, PNG or WebP, up to 10 MB.">
          <input
            key={inputKey}
            type="file"
            accept={ACCEPT}
            disabled={disabled}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
      </div>
      <Notice error>{error}</Notice>
      <div className="form-actions">
        <Button type="submit" variant="outline" disabled={disabled || busy || !file}>
          <Upload size={14} /> {busy ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
